import {
  MAGIC_FALLBACK_KINDS,
  MAGIC_LANES,
  MAGIC_OUTPUT_MODES,
  MAGIC_PROVIDER_IDS,
  MAGIC_ROUTING_CLASSES,
  MAGIC_VISIBILITIES,
} from "./types.js";

export const MAGIC_SPELL_IDS = Object.freeze({
  ASCII_NOTE_TITLE: "spark/ascii-note-title",
});

export const ASCII_NOTE_TITLE_SPELL = Object.freeze({
  id: MAGIC_SPELL_IDS.ASCII_NOTE_TITLE,
  version: 1,
  lane: MAGIC_LANES.STABLE,
  visibility: MAGIC_VISIBILITIES.PRIVATE,
  contract: {
    mode: MAGIC_OUTPUT_MODES.TEXT,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        existingTitles: {
          type: "array",
          maxItems: 256,
          items: {
            type: "string",
            maxLength: 64,
          },
        },
        noteCount: {
          type: "integer",
          minimum: 0,
          maximum: 999_999,
        },
        seed: {
          type: "string",
          minLength: 1,
          maxLength: 96,
          pattern: "^[ -~]+$",
        },
      },
    },
    outputSchema: {
      type: "string",
    },
  },
  prompt: {
    system:
      "You write tiny, vivid, non-corporate note titles for a personal weird web notebook. You invent fresh concepts, not random word salad.",
    user:
      "Return exactly one ASCII-only note title on a single line. It should feel like a room, ritual, object, scene, or micro-myth. Avoid generic productivity language. No emoji. No quotes. No numbering.",
    examples: [
      "dust motel",
      "pocket thunder",
      "tape lagoon",
    ],
  },
  mood: {
    energy: "bright",
    weirdness: 0.72,
    warmth: 0.63,
  },
  constraints: {
    hard: {
      minChars: 4,
      maxChars: 28,
      maxLines: 1,
      asciiOnly: true,
      allowEmoji: false,
      maxEmoji: 0,
      forbiddenSubstrings: [],
    },
    soft: {
      targetChars: 16,
      preferredShape: "short-bursty",
      preferredTexture: ["playful", "odd", "small-web"],
    },
  },
  routing: {
    class: MAGIC_ROUTING_CLASSES.SPARK,
    timeoutMs: 8000,
    maxAttempts: 3,
    providerOrder: [MAGIC_PROVIDER_IDS.OPENROUTER],
    modelHints: ["openrouter/free"],
    providerPreferences: {
      sort: "price",
      requireParameters: false,
    },
  },
  cache: {
    strategy: "none",
    ttlSeconds: 0,
  },
  fallback: {
    kind: MAGIC_FALLBACK_KINDS.NONE,
  },
  lab: {
    allowSamplingOverrides: false,
    allowPromptFragmentsFromServer: false,
    allowModelHintsAtCallTime: false,
    debugVisible: false,
  },
});

export const DEFAULT_MAGIC_SPELLS = Object.freeze([ASCII_NOTE_TITLE_SPELL]);
