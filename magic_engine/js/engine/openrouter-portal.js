import { MAGIC_PROVIDER_IDS } from "./types.js";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

export function createOpenRouterPortal({
  apiKey,
  fetchImpl = globalThis.fetch,
  model = "openrouter/free",
  referer,
  title,
  onEvent,
} = {}) {
  const normalizedApiKey = String(apiKey || "").trim();

  if (!normalizedApiKey) {
    throw new Error("Missing OpenRouter API key");
  }

  if (typeof fetchImpl !== "function") {
    throw new TypeError("fetchImpl must be a function");
  }

  return {
    id: MAGIC_PROVIDER_IDS.OPENROUTER,
    async cast({ spell, input }) {
      const requestedModel = resolveRequestedModel(spell, model);
      const requestBody = {
        model: requestedModel,
        messages: buildSpellMessages(spell, input),
        modalities: ["text"],
        reasoning: {
          exclude: true,
        },
        temperature: getSpellTemperature(spell),
        max_tokens: Math.min(
          80,
          Math.max(40, (spell.constraints.hard?.maxChars ?? 40) * 3),
        ),
        seed: input.seed ? hashSeedToInteger(input.seed) : undefined,
      };

      await emitEvent(onEvent, {
        type: "openrouter.request",
        timestamp: new Date().toISOString(),
        spellId: spell.id,
        spellVersion: spell.version,
        input,
        request: {
          url: OPENROUTER_API_URL,
          requestedModel,
          body: requestBody,
        },
      });

      const response = await fetchImpl(OPENROUTER_API_URL, {
        method: "POST",
        headers: createOpenRouterHeaders({
          apiKey: normalizedApiKey,
          referer,
          title,
        }),
        body: JSON.stringify(requestBody),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        await emitEvent(onEvent, {
          type: "openrouter.error",
          timestamp: new Date().toISOString(),
          spellId: spell.id,
          spellVersion: spell.version,
          input,
          request: {
            requestedModel,
            body: requestBody,
          },
          response: {
            status: response.status,
            headers: readRateLimitHeaders(response),
            payload,
          },
        });

        const error = new Error(
          payload?.error?.metadata?.raw ||
            payload?.error?.message ||
            payload?.message ||
            `OpenRouter request failed with ${response.status}`,
        );
        error.openRouter = {
          status: response.status,
          requestedModel,
          resetAtMs:
            Number(response.headers.get("x-ratelimit-reset")) ||
            Number(payload?.error?.metadata?.headers?.["X-RateLimit-Reset"]) ||
            null,
        };
        throw error;
      }

      const output = extractMessageText(payload?.choices?.[0]?.message);

      if (!output) {
        await emitEvent(onEvent, {
          type: "openrouter.empty-content",
          timestamp: new Date().toISOString(),
          spellId: spell.id,
          spellVersion: spell.version,
          input,
          request: {
            requestedModel,
            body: requestBody,
          },
          response: {
            status: response.status,
            headers: readRateLimitHeaders(response),
            payload,
          },
        });

        const error = new Error(`OpenRouter returned no text content for ${requestedModel}`);
        error.openRouter = {
          status: response.status,
          requestedModel,
          resetAtMs:
            Number(response.headers.get("x-ratelimit-reset")) ||
            Number(payload?.error?.metadata?.headers?.["X-RateLimit-Reset"]) ||
            null,
        };
        throw error;
      }

      const cleanedOutput = cleanModelOutput(output);
      await emitEvent(onEvent, {
        type: "openrouter.success",
        timestamp: new Date().toISOString(),
        spellId: spell.id,
        spellVersion: spell.version,
        input,
        request: {
          requestedModel,
          body: requestBody,
        },
        response: {
          status: response.status,
          headers: readRateLimitHeaders(response),
          payload,
        },
        output: {
          raw: output,
          cleaned: cleanedOutput,
        },
      });

      return {
        output: cleanedOutput,
        model: payload?.model || requestedModel,
        usage: payload?.usage ?? null,
      };
    },
  };
}

export async function listOpenRouterFreeModels({
  apiKey,
  fetchImpl = globalThis.fetch,
} = {}) {
  const normalizedApiKey = String(apiKey || "").trim();

  if (!normalizedApiKey) {
    throw new Error("Missing OpenRouter API key");
  }

  const response = await fetchImpl(OPENROUTER_MODELS_URL, {
    headers: createOpenRouterHeaders({ apiKey: normalizedApiKey }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        payload?.message ||
        `OpenRouter models request failed with ${response.status}`,
    );
  }

  return (payload?.data ?? [])
    .filter((model) => isFreeTextModel(model))
    .map((model) => ({
      id: model.id,
      name: model.name,
      contextLength: model.context_length,
      supportedParameters: model.supported_parameters ?? [],
    }))
    .sort((left, right) => scoreFreeTextModel(right) - scoreFreeTextModel(left));
}

function buildSpellMessages(spell, input) {
  const lines = [
    spell.prompt.user,
    "",
    "Constraints:",
    `- ASCII only: ${spell.constraints.hard.asciiOnly ? "yes" : "no"}`,
    `- Max chars: ${spell.constraints.hard.maxChars}`,
    `- Max lines: ${spell.constraints.hard.maxLines}`,
    `- Emoji allowed: ${spell.constraints.hard.allowEmoji ? "yes" : "no"}`,
    "",
    "Desired texture:",
    `- energy: ${spell.mood.energy}`,
    `- weirdness: ${spell.mood.weirdness}`,
    `- warmth: ${spell.mood.warmth}`,
    `- shape: ${spell.constraints.soft.preferredShape}`,
    `- texture: ${spell.constraints.soft.preferredTexture.join(", ")}`,
  ];

  if (Array.isArray(spell.prompt.examples) && spell.prompt.examples.length) {
    lines.push("", "Good examples:");
    for (const example of spell.prompt.examples) {
      lines.push(`- ${example}`);
    }
  }

  const existingTitles = normalizeExistingTitles(input.existingTitles);
  if (existingTitles.length) {
    lines.push("", "Do not repeat or closely paraphrase these existing titles:");
    for (const title of existingTitles.slice(0, 40)) {
      lines.push(`- ${title}`);
    }
  }

  if (Number.isInteger(input.noteCount)) {
    lines.push("", `Note index in collection: ${input.noteCount + 1}`);
  }

  lines.push(
    "",
    "Return only the title text. No explanation, no prefix, no markdown.",
  );

  return [
    {
      role: "system",
      content: spell.prompt.system,
    },
    {
      role: "user",
      content: lines.join("\n"),
    },
  ];
}

function cleanModelOutput(text) {
  return text
    .replace(/\r\n/g, "\n")
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^\d+[\).\-\s]+/, "")
    .trim();
}

function getSpellTemperature(spell) {
  const weirdness = Number(spell.mood?.weirdness ?? 0.5);
  return Math.max(0.7, Math.min(1.35, 0.8 + weirdness * 0.5));
}

function normalizeExistingTitles(existingTitles) {
  if (!Array.isArray(existingTitles)) {
    return [];
  }

  return existingTitles
    .map((title) => String(title || "").trim())
    .filter(Boolean);
}

function isFreeTextModel(model) {
  if (!model || typeof model !== "object") {
    return false;
  }

  const promptPrice = Number(model?.pricing?.prompt ?? NaN);
  const completionPrice = Number(model?.pricing?.completion ?? NaN);
  const outputsText = model?.architecture?.output_modalities?.includes("text");

  return outputsText && promptPrice === 0 && completionPrice === 0;
}

function extractMessageText(message) {
  if (!message || typeof message !== "object") {
    return "";
  }

  if (typeof message.content === "string") {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part?.type === "text") {
          return part.text ?? "";
        }

        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

function scoreFreeTextModel(model) {
  const label = `${model.id} ${model.name || ""}`.toLowerCase();
  let score = 0;

  if (label.includes("instruct")) {
    score += 40;
  }

  if (label.includes("chat")) {
    score += 20;
  }

  if (/(^|[-_/])it($|[-_/])/.test(label) || label.endsWith("-it")) {
    score += 18;
  }

  if (label.includes("thinking") || label.includes("reasoning")) {
    score -= 80;
  }

  if (label.includes("coder")) {
    score -= 35;
  }

  if (
    label.includes("vision") ||
    label.includes("vl") ||
    label.includes("audio") ||
    label.includes("image")
  ) {
    score -= 60;
  }

  if (label.includes("preview")) {
    score -= 15;
  }

  if (model.supportedParameters.includes("temperature")) {
    score += 5;
  }

  return score;
}

function resolveRequestedModel(spell, fallbackModel) {
  const hintedModel = Array.isArray(spell.routing?.modelHints)
    ? spell.routing.modelHints.find(Boolean)
    : null;
  return hintedModel || fallbackModel;
}

function createOpenRouterHeaders({ apiKey, referer, title } = {}) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (referer) {
    headers["HTTP-Referer"] = referer;
  }

  if (title) {
    headers["X-Title"] = title;
  }

  return headers;
}

function hashSeedToInteger(seed) {
  let hash = 2_166_136_261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

function readRateLimitHeaders(response) {
  return {
    limit: response.headers.get("x-ratelimit-limit"),
    remaining: response.headers.get("x-ratelimit-remaining"),
    reset: response.headers.get("x-ratelimit-reset"),
  };
}

async function emitEvent(onEvent, event) {
  if (typeof onEvent !== "function") {
    return;
  }

  await onEvent(event);
}
