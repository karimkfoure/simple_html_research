import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const experimentRoot = resolve(scriptDir, "..");
const defaultInputPath = join(experimentRoot, "data", "oneline-art.jsonl");
const defaultOutputPath = join(experimentRoot, "data", "oneline-art-strings.json");

function parseArgs(argv) {
  const options = {
    file: defaultInputPath,
    output: defaultOutputPath,
    minLength: 11
  };

  for (const argument of argv) {
    if (argument.startsWith("--file=")) options.file = resolve(process.cwd(), argument.slice(7));
    if (argument.startsWith("--output=")) options.output = resolve(process.cwd(), argument.slice(9));
    if (argument.startsWith("--min-length=")) options.minLength = Number.parseInt(argument.slice(13), 10);
  }

  if (!Number.isInteger(options.minLength) || options.minLength < 1) {
    throw new Error("--min-length debe ser un entero positivo");
  }

  return options;
}

function stripOuterNewlines(value) {
  return value.replace(/^\s*\n+/, "").replace(/\n+\s*$/, "");
}

function normalizeKey(value) {
  return value.replace(/\r/g, "").trim();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const raw = await readFile(options.file, "utf8");

  const seen = new Set();
  const cleaned = [];

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;

    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }

    const art = stripOuterNewlines(String(record.art ?? "")).replace(/\r/g, "");
    if (art.trim().length < options.minLength) continue;

    const key = normalizeKey(art);
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(art);
  }

  await writeFile(options.output, `${JSON.stringify(cleaned, null, 2)}\n`, "utf8");

  console.log(`Saved ${cleaned.length} strings to ${options.output}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
