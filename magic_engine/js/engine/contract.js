import {
  MAGIC_FALLBACK_KINDS,
  MAGIC_LANES,
  MAGIC_OUTPUT_MODES,
  MAGIC_PROVIDER_IDS,
  MAGIC_ROUTING_CLASSES,
  MAGIC_VISIBILITIES,
} from "./types.js";

export function assertSpellDefinition(spell) {
  if (!spell || typeof spell !== "object") {
    throw new TypeError("Spell definition must be an object");
  }

  assertNonEmptyString(spell.id, "spell.id");
  assertPositiveInteger(spell.version, "spell.version");
  assertEnumValue(spell.lane, Object.values(MAGIC_LANES), "spell.lane");
  assertEnumValue(
    spell.visibility,
    Object.values(MAGIC_VISIBILITIES),
    "spell.visibility",
  );

  if (!spell.contract || typeof spell.contract !== "object") {
    throw new TypeError("spell.contract must be an object");
  }

  assertEnumValue(
    spell.contract.mode,
    Object.values(MAGIC_OUTPUT_MODES),
    "spell.contract.mode",
  );
  assertSchemaDefinition(spell.contract.inputSchema, "spell.contract.inputSchema");
  assertSchemaDefinition(spell.contract.outputSchema, "spell.contract.outputSchema");

  if (!spell.prompt || typeof spell.prompt !== "object") {
    throw new TypeError("spell.prompt must be an object");
  }

  assertString(spell.prompt.system, "spell.prompt.system");
  assertString(spell.prompt.user, "spell.prompt.user");

  if (!Array.isArray(spell.prompt.examples)) {
    throw new TypeError("spell.prompt.examples must be an array");
  }

  if (!spell.constraints || typeof spell.constraints !== "object") {
    throw new TypeError("spell.constraints must be an object");
  }

  assertHardConstraints(spell.constraints.hard);
  assertSoftConstraints(spell.constraints.soft);

  if (!spell.routing || typeof spell.routing !== "object") {
    throw new TypeError("spell.routing must be an object");
  }

  assertEnumValue(
    spell.routing.class,
    Object.values(MAGIC_ROUTING_CLASSES),
    "spell.routing.class",
  );
  assertPositiveInteger(spell.routing.timeoutMs, "spell.routing.timeoutMs");
  assertPositiveInteger(spell.routing.maxAttempts, "spell.routing.maxAttempts");
  assertStringArray(spell.routing.providerOrder, "spell.routing.providerOrder", 1);

  for (const providerId of spell.routing.providerOrder) {
    assertEnumValue(
      providerId,
      Object.values(MAGIC_PROVIDER_IDS),
      "spell.routing.providerOrder[]",
    );
  }

  if (!spell.cache || typeof spell.cache !== "object") {
    throw new TypeError("spell.cache must be an object");
  }

  assertEnumValue(
    spell.cache.strategy,
    ["none", "exact-input", "time-window"],
    "spell.cache.strategy",
  );
  assertNonNegativeInteger(spell.cache.ttlSeconds, "spell.cache.ttlSeconds");

  if (!spell.fallback || typeof spell.fallback !== "object") {
    throw new TypeError("spell.fallback must be an object");
  }

  assertEnumValue(
    spell.fallback.kind,
    Object.values(MAGIC_FALLBACK_KINDS),
    "spell.fallback.kind",
  );

  if (!spell.lab || typeof spell.lab !== "object") {
    throw new TypeError("spell.lab must be an object");
  }

  assertBoolean(
    spell.lab.allowSamplingOverrides,
    "spell.lab.allowSamplingOverrides",
  );
  assertBoolean(
    spell.lab.allowPromptFragmentsFromServer,
    "spell.lab.allowPromptFragmentsFromServer",
  );
  assertBoolean(
    spell.lab.allowModelHintsAtCallTime,
    "spell.lab.allowModelHintsAtCallTime",
  );
  assertBoolean(spell.lab.debugVisible, "spell.lab.debugVisible");

  return spell;
}

export function validateInputAgainstSchema(value, schema, label = "input") {
  switch (schema.type) {
    case "object":
      validateObjectSchema(value, schema, label);
      return value;
    case "array":
      validateArraySchema(value, schema, label);
      return value;
    case "string":
      validateStringSchema(value, schema, label);
      return value;
    case "integer":
      validateIntegerSchema(value, schema, label);
      return value;
    case "boolean":
      if (typeof value !== "boolean") {
        throw new TypeError(`${label} must be a boolean`);
      }
      return value;
    default:
      throw new TypeError(`Unsupported schema type: ${schema.type}`);
  }
}

export function normalizeSpellTextOutput(spell, rawOutput) {
  if (spell.contract.outputSchema.type !== "string") {
    throw new TypeError("Only string outputs are supported in this first pass");
  }

  assertString(rawOutput, "rawOutput");

  const hard = spell.constraints.hard ?? {};
  const trimmedLines = rawOutput
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  if (trimmedLines.length === 0) {
    throw new TypeError("Spell output is empty after trimming");
  }

  const maxLines = hard.maxLines ?? 1;
  const joined = trimmedLines.slice(0, maxLines).join(maxLines === 1 ? " " : "\n");
  let output = normalizeWhitespace(joined);

  if (hard.asciiOnly && /[^\x20-\x7E]/.test(output)) {
    throw new TypeError("Spell output contains non-ASCII characters");
  }

  if (!hard.allowEmoji && /[\p{Extended_Pictographic}]/u.test(output)) {
    throw new TypeError("Spell output contains forbidden emoji");
  }

  if (!output) {
    throw new TypeError("Spell output became empty after normalization");
  }

  if (Array.isArray(hard.forbiddenSubstrings)) {
    const lowered = output.toLowerCase();

    for (const forbidden of hard.forbiddenSubstrings) {
      if (lowered.includes(String(forbidden).toLowerCase())) {
        throw new TypeError("Spell output contains forbidden substring");
      }
    }
  }

  const minChars = hard.minChars ?? 1;
  const maxChars = hard.maxChars ?? output.length;

  if (output.length < minChars) {
    throw new TypeError("Spell output is shorter than minChars");
  }

  output = clampTextLength(output, maxChars);

  if (output.length < minChars) {
    throw new TypeError("Spell output is shorter than minChars after clamping");
  }

  return output;
}

function assertSchemaDefinition(schema, label) {
  if (!schema || typeof schema !== "object") {
    throw new TypeError(`${label} must be an object`);
  }

  assertEnumValue(
    schema.type,
    ["object", "array", "string", "integer", "boolean"],
    `${label}.type`,
  );

  if (schema.type === "object" && schema.properties != null) {
    if (!schema.properties || typeof schema.properties !== "object") {
      throw new TypeError(`${label}.properties must be an object`);
    }

    for (const [key, childSchema] of Object.entries(schema.properties)) {
      assertSchemaDefinition(childSchema, `${label}.properties.${key}`);
    }
  }

  if (schema.type === "array" && schema.items != null) {
    assertSchemaDefinition(schema.items, `${label}.items`);
  }

  if (schema.enum != null && !Array.isArray(schema.enum)) {
    throw new TypeError(`${label}.enum must be an array`);
  }
}

function validateObjectSchema(value, schema, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }

  const properties = schema.properties ?? {};
  const required = schema.required ?? [];
  const keys = Object.keys(value);

  for (const requiredKey of required) {
    if (!(requiredKey in value)) {
      throw new TypeError(`${label}.${requiredKey} is required`);
    }
  }

  if (schema.additionalProperties === false) {
    for (const key of keys) {
      if (!(key in properties)) {
        throw new TypeError(`${label}.${key} is not allowed`);
      }
    }
  }

  for (const [key, childSchema] of Object.entries(properties)) {
    if (value[key] === undefined) {
      continue;
    }

    validateInputAgainstSchema(value[key], childSchema, `${label}.${key}`);
  }
}

function validateArraySchema(value, schema, label) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array`);
  }

  if (schema.maxItems != null && value.length > schema.maxItems) {
    throw new TypeError(`${label} exceeds maxItems`);
  }

  if (schema.items) {
    for (let index = 0; index < value.length; index += 1) {
      validateInputAgainstSchema(value[index], schema.items, `${label}[${index}]`);
    }
  }
}

function validateStringSchema(value, schema, label) {
  assertString(value, label);

  if (schema.maxLength != null && value.length > schema.maxLength) {
    throw new TypeError(`${label} exceeds maxLength`);
  }

  if (schema.minLength != null && value.length < schema.minLength) {
    throw new TypeError(`${label} is shorter than minLength`);
  }

  if (schema.pattern != null && !(new RegExp(schema.pattern, "u")).test(value)) {
    throw new TypeError(`${label} does not match required pattern`);
  }

  if (schema.enum != null && !schema.enum.includes(value)) {
    throw new TypeError(`${label} must be one of: ${schema.enum.join(", ")}`);
  }
}

function validateIntegerSchema(value, schema, label) {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${label} must be an integer`);
  }

  if (schema.minimum != null && value < schema.minimum) {
    throw new TypeError(`${label} is below minimum`);
  }

  if (schema.maximum != null && value > schema.maximum) {
    throw new TypeError(`${label} exceeds maximum`);
  }
}

function assertHardConstraints(value) {
  if (!value || typeof value !== "object") {
    throw new TypeError("spell.constraints.hard must be an object");
  }

  assertPositiveInteger(value.minChars, "spell.constraints.hard.minChars");
  assertPositiveInteger(value.maxChars, "spell.constraints.hard.maxChars");
  assertPositiveInteger(value.maxLines, "spell.constraints.hard.maxLines");
  assertBoolean(value.asciiOnly, "spell.constraints.hard.asciiOnly");
  assertBoolean(value.allowEmoji, "spell.constraints.hard.allowEmoji");
  assertNonNegativeInteger(value.maxEmoji, "spell.constraints.hard.maxEmoji");
  assertStringArray(
    value.forbiddenSubstrings,
    "spell.constraints.hard.forbiddenSubstrings",
  );
}

function assertSoftConstraints(value) {
  if (!value || typeof value !== "object") {
    throw new TypeError("spell.constraints.soft must be an object");
  }

  assertPositiveInteger(value.targetChars, "spell.constraints.soft.targetChars");
  assertString(value.preferredShape, "spell.constraints.soft.preferredShape");
  assertStringArray(
    value.preferredTexture,
    "spell.constraints.soft.preferredTexture",
  );
}

function clampTextLength(text, maxChars) {
  if (text.length <= maxChars) {
    return text;
  }

  const sliced = text.slice(0, maxChars + 1);
  const boundary = sliced.lastIndexOf(" ");

  if (boundary >= Math.max(4, Math.floor(maxChars * 0.55))) {
    return sliced.slice(0, boundary).trim();
  }

  return text.slice(0, maxChars).trim();
}

function normalizeWhitespace(text) {
  return text.trim().replace(/\s+/g, " ");
}

function assertEnumValue(value, allowedValues, label) {
  if (!allowedValues.includes(value)) {
    throw new TypeError(`${label} must be one of: ${allowedValues.join(", ")}`);
  }
}

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive integer`);
  }
}

function assertNonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative integer`);
  }
}

function assertBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw new TypeError(`${label} must be a boolean`);
  }
}

function assertString(value, label) {
  if (typeof value !== "string") {
    throw new TypeError(`${label} must be a string`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}

function assertStringArray(value, label, minLength = 0) {
  if (!Array.isArray(value) || value.length < minLength) {
    throw new TypeError(`${label} must be an array`);
  }

  for (const item of value) {
    assertString(item, `${label}[]`);
  }
}
