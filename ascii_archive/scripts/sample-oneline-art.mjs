import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const experimentRoot = resolve(scriptDir, "..");
const defaultJsonlPath = join(experimentRoot, "data", "oneline-art.jsonl");

function parseArgs(argv) {
  const options = {
    count: 10,
    file: defaultJsonlPath,
    query: "",
    source: "",
    asciiOnly: false,
    excludePlaceholders: false,
    unique: false
  };

  for (const argument of argv) {
    if (argument.startsWith("--count=")) options.count = Number.parseInt(argument.slice(8), 10);
    if (argument.startsWith("--file=")) options.file = resolve(process.cwd(), argument.slice(7));
    if (argument.startsWith("--query=")) options.query = argument.slice(8).trim().toLowerCase();
    if (argument.startsWith("--source=")) options.source = argument.slice(9).trim().toLowerCase();
    if (argument === "--ascii-only") options.asciiOnly = true;
    if (argument === "--exclude-placeholders") options.excludePlaceholders = true;
    if (argument === "--unique") options.unique = true;
  }

  if (!Number.isInteger(options.count) || options.count < 1) {
    throw new Error("--count debe ser un entero positivo");
  }

  return options;
}

function matchesQuery(record, query) {
  if (!query) return true;

  const haystack = [
    record.title,
    record.source,
    record.source_category,
    record.source_section,
    record.creator,
    record.art
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  return haystack.includes(query);
}

function uniqueByArt(records) {
  const seen = new Set();
  const results = [];

  for (const record of records) {
    if (seen.has(record.art)) continue;
    seen.add(record.art);
    results.push(record);
  }

  return results;
}

function pickRandom(records, count) {
  const pool = [...records];

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }

  return pool.slice(0, count);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const raw = await readFile(options.file, "utf8");
  const records = raw
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((record) => matchesQuery(record, options.query))
    .filter((record) => !options.source || String(record.source).toLowerCase() === options.source)
    .filter((record) => !options.asciiOnly || record.ascii_only)
    .filter((record) => !options.excludePlaceholders || !record.has_placeholder);

  const finalPool = options.unique ? uniqueByArt(records) : records;
  const sample = pickRandom(finalPool, options.count);

  console.log(`Pool: ${finalPool.length} items`);
  console.log("");

  sample.forEach((record, index) => {
    const label = [record.source, record.source_category || record.source_section || record.title].filter(Boolean).join(" | ");
    console.log(`[${index + 1}] ${label}`);
    console.log(record.art);
    console.log("");
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
