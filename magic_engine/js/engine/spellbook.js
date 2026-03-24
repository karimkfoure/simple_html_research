import {
  MAGIC_FALLBACK_KINDS,
  MAGIC_LANES,
  MAGIC_OUTPUT_MODES,
  MAGIC_PROVIDER_IDS,
  MAGIC_ROUTING_CLASSES,
  MAGIC_VISIBILITIES,
} from "./types.js";

export const MAGIC_SPELL_IDS = Object.freeze({
  ASCII_OBJECT_PACK: "spark/one-line-ascii-object-pack",
  ASCII_GESTURE_PACK: "spark/one-line-ascii-gesture-pack",
  ASCII_DIVIDER_PACK: "spark/one-line-ascii-divider-pack",
  ASCII_PHRASE_PACK: "spark/phrase-to-one-line-ascii-pack",
});

const BASE_STRING_ITEM_SCHEMA = Object.freeze({
  type: "string",
  minLength: 4,
  maxLength: 56,
  pattern: "^[ -~]+$",
});

const BASE_ROUTING = Object.freeze({
  class: MAGIC_ROUTING_CLASSES.SPARK,
  timeoutMs: 8000,
  maxAttempts: 3,
  providerOrder: [MAGIC_PROVIDER_IDS.OPENROUTER],
  modelHints: ["openrouter/free"],
  providerPreferences: {
    sort: "price",
    requireParameters: false,
  },
});

function createInputSchema({ requirePhrase = false } = {}) {
  return {
    type: "object",
    additionalProperties: false,
    required: requirePhrase ? ["phrase"] : [],
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
      optionCount: {
        type: "integer",
        minimum: 2,
        maximum: 8,
      },
      phrase: {
        type: "string",
        minLength: 3,
        maxLength: 96,
        pattern: "^[ -~]+$",
      },
      seed: {
        type: "string",
        minLength: 1,
        maxLength: 96,
        pattern: "^[ -~]+$",
      },
    },
  };
}

function createArrayOutputSchema() {
  return {
    type: "array",
    minItems: 2,
    maxItems: 8,
    items: BASE_STRING_ITEM_SCHEMA,
  };
}

function createBaseSpell({
  id,
  label,
  summary,
  tags,
  defaultPhrase = "",
  requiresPhrase = false,
  system,
  user,
  examples,
  energy,
  weirdness,
  warmth,
  preferredShape,
  preferredTexture,
  targetChars,
  maxChars = 56,
}) {
  return Object.freeze({
    id,
    version: 1,
    lane: MAGIC_LANES.STABLE,
    visibility: MAGIC_VISIBILITIES.PRIVATE,
    contract: {
      mode: MAGIC_OUTPUT_MODES.TEXT,
      inputSchema: createInputSchema({ requirePhrase: requiresPhrase }),
      outputSchema: createArrayOutputSchema(),
    },
    prompt: {
      system,
      user,
      examples,
    },
    mood: {
      energy,
      weirdness,
      warmth,
    },
    constraints: {
      hard: {
        minChars: 4,
        maxChars,
        maxLines: 1,
        asciiOnly: true,
        allowEmoji: false,
        maxEmoji: 0,
        forbiddenSubstrings: [],
      },
      soft: {
        targetChars,
        preferredShape,
        preferredTexture,
      },
    },
    routing: BASE_ROUTING,
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
    presentation: {
      label,
      summary,
      tags,
      requiresPhrase,
      defaultPhrase,
    },
  });
}

export const ASCII_OBJECT_PACK_SPELL = createBaseSpell({
  id: MAGIC_SPELL_IDS.ASCII_OBJECT_PACK,
  label: "objetos y criaturas",
  summary:
    "Opciones visuales compactas: objeto, animal o microescena reconocible en una sola linea.",
  tags: ["ascii", "1 line", "object", "creature"],
  system:
    "You design compact one-line ASCII art headers for a personal weird web notebook. Think in silhouettes, not prose. The result should read instantly as a tiny object, creature, or scene.",
  user:
    "Generate several distinct one-line ASCII art title options. Favor tiny objects, creatures, or micro-scenes. Keep them visual, copy-pasteable, and weird enough to feel personal.",
  examples: ["@-->--->---", ">++('>", "_.~\"~._"],
  energy: "bright",
  weirdness: 0.78,
  warmth: 0.66,
  preferredShape: "compact-silhouette",
  preferredTexture: ["visual", "tiny-scene", "playful"],
  targetChars: 18,
});

export const ASCII_GESTURE_PACK_SPELL = createBaseSpell({
  id: MAGIC_SPELL_IDS.ASCII_GESTURE_PACK,
  label: "caras y gestos",
  summary:
    "Mini gestos, caras o escenas con actitud. Menos objeto, mas expresion y accion minima.",
  tags: ["ascii", "1 line", "gesture", "face"],
  system:
    "You design one-line ASCII art headers with attitude. Focus on faces, gestures, reactions, or tiny action beats instead of descriptive titles.",
  user:
    "Generate several distinct one-line ASCII art title options based on faces, gestures, or tiny action scenes. They should feel expressive and memorable without turning into prose.",
  examples: ["{-_-}", "[-)", ":-!"],
  energy: "electric",
  weirdness: 0.84,
  warmth: 0.48,
  preferredShape: "expressive-burst",
  preferredTexture: ["attitude", "reaction", "small-web"],
  targetChars: 16,
});

export const ASCII_DIVIDER_PACK_SPELL = createBaseSpell({
  id: MAGIC_SPELL_IDS.ASCII_DIVIDER_PACK,
  label: "dividers y texturas",
  summary:
    "Lineas decorativas y ritmicas para usar como encabezado visual o barra de separacion con personalidad.",
  tags: ["ascii", "1 line", "divider", "texture"],
  system:
    "You design one-line ASCII divider headers for a personal weird web notebook. Think rhythm, texture, banner, wave, or ornamental bar rather than sentence fragments.",
  user:
    "Generate several distinct one-line ASCII divider options. They should feel decorative and title-like, with rhythm or texture, but still remain simple and printable.",
  examples: ["\"`-._,-'\"`-._,-'", ".-~-.-~-.-~", "_.~\"~._.~\"~._"],
  energy: "steady",
  weirdness: 0.69,
  warmth: 0.58,
  preferredShape: "long-ribbon",
  preferredTexture: ["decorative", "rhythmic", "banner"],
  targetChars: 24,
  maxChars: 64,
});

export const ASCII_PHRASE_PACK_SPELL = createBaseSpell({
  id: MAGIC_SPELL_IDS.ASCII_PHRASE_PACK,
  label: "frase a glifo",
  summary:
    "Dada una frase, el modelo la interpreta y devuelve varios one-line ascii art literales o metaforicos.",
  tags: ["ascii", "1 line", "phrase", "metaphor"],
  defaultPhrase: "night train with paper ghosts",
  requiresPhrase: true,
  system:
    "You translate short phrases into compact one-line ASCII art headers. You think visually first: literal, symbolic, or metaphorical, but never as plain wording.",
  user:
    "Given the input phrase, generate several different one-line ASCII art options inspired by it. Some may be literal and some metaphorical, but every option must remain visual rather than verbal.",
  examples: ["c[]", "@->-->--", "~^~^~'====>`~^~"],
  energy: "curious",
  weirdness: 0.91,
  warmth: 0.61,
  preferredShape: "concept-silhouette",
  preferredTexture: ["metaphoric", "evocative", "surprising"],
  targetChars: 22,
});

export const DEFAULT_MAGIC_SPELLS = Object.freeze([
  ASCII_OBJECT_PACK_SPELL,
  ASCII_GESTURE_PACK_SPELL,
  ASCII_DIVIDER_PACK_SPELL,
  ASCII_PHRASE_PACK_SPELL,
]);
