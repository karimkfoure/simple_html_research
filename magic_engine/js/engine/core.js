import {
  assertSpellDefinition,
  normalizeSpellOutput,
  validateInputAgainstSchema,
} from "./contract.js";
import { DEFAULT_MAGIC_SPELLS } from "./spellbook.js";
import { MAGIC_PROVIDER_IDS } from "./types.js";

export function createSpellbook(spells = DEFAULT_MAGIC_SPELLS) {
  const registry = new Map();

  for (const spell of spells) {
    assertSpellDefinition(spell);

    if (registry.has(spell.id)) {
      throw new TypeError(`Duplicate spell id: ${spell.id}`);
    }

    registry.set(spell.id, spell);
  }

  return registry;
}

export function listSpells(spellbook) {
  return [...spellbook.values()].map((spell) => ({
    id: spell.id,
    version: spell.version,
    lane: spell.lane,
    visibility: spell.visibility,
    label: spell.presentation?.label ?? spell.id,
    summary: spell.presentation?.summary ?? "",
    tags: spell.presentation?.tags ?? [],
    requiresPhrase: Boolean(spell.presentation?.requiresPhrase),
    defaultPhrase: spell.presentation?.defaultPhrase ?? "",
  }));
}

export async function castSpell({
  spellbook = createSpellbook(),
  spellId,
  input = {},
  portals = {},
  random = Math.random,
  now = () => Date.now(),
} = {}) {
  const spell = spellbook.get(spellId);

  if (!spell) {
    throw new TypeError(`Unknown spell: ${spellId}`);
  }

  validateInputAgainstSchema(input, spell.contract.inputSchema, "input");

  const startAt = now();
  const attemptProviders = spell.routing.providerOrder;
  let lastError = null;

  for (const providerId of attemptProviders) {
    try {
      const providerResult = await runProvider({
        providerId,
        spell,
        input,
        portals,
        random,
      });

      const output = normalizeSpellOutput(spell, providerResult.output);

      return {
        ok: true,
        spellId: spell.id,
        spellVersion: spell.version,
        output,
        source: {
          provider: providerId,
          model: providerResult.model ?? "runtime",
          cacheHit: false,
          fallbackUsed: false,
        },
        timings: {
          totalMs: Math.max(0, now() - startAt),
        },
        usage: providerResult.usage ?? null,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`Spell failed without provider result: ${spellId}`);
}

export function createDeterministicRandom(seed = "magic-engine") {
  let state = hashSeed(seed) || 1;

  return function nextRandom() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;

    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
}

async function runProvider({ providerId, spell, input, portals, random }) {
  const portal = portals[providerId];

  if (!portal || typeof portal.cast !== "function") {
    throw new TypeError(`Missing portal adapter for provider ${providerId}`);
  }

  return portal.cast({
    spell,
    input,
    random,
  });
}

function hashSeed(seed) {
  let hash = 2_166_136_261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}
