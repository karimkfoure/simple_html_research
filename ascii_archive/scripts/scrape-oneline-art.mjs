import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const experimentRoot = resolve(scriptDir, "..");
const dataDir = join(experimentRoot, "data");
const outputJsonlPath = join(dataDir, "oneline-art.jsonl");
const outputSummaryPath = join(dataDir, "oneline-art-summary.json");
const execFile = promisify(execFileCallback);

const requestHeaders = {
  "accept-language": "en-US,en;q=0.9",
  "user-agent": "simple_html_research/1.0 (+https://github.com/karimkfoure/simple_html_research)"
};

const asciiArtEuRootUrl = "https://www.asciiart.eu/one-line";
const gistRawUrl = "https://gist.githubusercontent.com/jamiew/40c66061b666272462c17f65addb14d5/raw";
const onelineAsciiArtBlogUrl = "https://onelineasciiart.blogspot.com/";
const asciiArtCopyUrl = "https://www.asciiartcopy.com/one-line-ascii-art.html";
const emotesIoUrl = "https://emotes.io/";

async function fetchText(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(url, {
      headers: requestHeaders,
      redirect: "follow",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
    }

    return response.text();
  } catch (error) {
    const curlArgs = [
      "-L",
      "--silent",
      "--show-error",
      "--max-time",
      "30",
      "--user-agent",
      requestHeaders["user-agent"],
      "--header",
      `accept-language: ${requestHeaders["accept-language"]}`,
      url
    ];
    const { stdout } = await execFile("curl", curlArgs, { maxBuffer: 20 * 1024 * 1024 });
    return stdout;
  } finally {
    clearTimeout(timeoutId);
  }
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function decodeJsString(rawValue) {
  return JSON.parse(`"${rawValue}"`);
}

function stripOuterNewlines(value) {
  return value.replace(/^\s*\n+/, "").replace(/\n+\s*$/, "");
}

function normalizeWhitespaceForKey(value) {
  return value.replace(/\r/g, "").trim();
}

function countLines(value) {
  if (!value.length) return 0;
  return value.split("\n").length;
}

function isAsciiOnly(value) {
  return /^[\x20-\x7E]*$/.test(value);
}

function hasPlaceholder(value) {
  return /\[(?:text|emoji)\]|your text here/i.test(value);
}

function splitArtAndLabel(rawValue) {
  const normalized = stripOuterNewlines(String(rawValue ?? "")).replace(/\u00a0/g, " ");
  const lines = normalized
    .split("\n")
    .map((line) => line.replace(/\r/g, "").replace(/[ \t]+$/g, ""))
    .filter((line) => line.trim().length > 0);

  if (!lines.length) {
    return { art: "", title: null };
  }

  if (lines.length > 1) {
    const lastLine = lines[lines.length - 1].trim();
    if (/^[A-Za-z][A-Za-z0-9 '&().-]{0,60}$/.test(lastLine)) {
      return {
        art: lines.slice(0, -1).join("\n"),
        title: lastLine
      };
    }
  }

  const inlineLabelMatch = normalized.match(/^(.*?)(?:\s{2,}|\s)([A-Za-z][A-Za-z0-9 '&().-]{0,60})$/);
  if (inlineLabelMatch && /[^\w\s]/u.test(inlineLabelMatch[1])) {
    return {
      art: inlineLabelMatch[1].replace(/[ \t]+$/g, ""),
      title: inlineLabelMatch[2].trim()
    };
  }

  return { art: normalized, title: null };
}

function slugToLabel(slug) {
  return slug
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function prepareRecord(partial) {
  const art = stripOuterNewlines(String(partial.art ?? "")).replace(/\r/g, "");

  return {
    ...partial,
    art,
    line_count: countLines(art),
    char_count: art.length,
    ascii_only: isAsciiOnly(art),
    has_placeholder: hasPlaceholder(art)
  };
}

function uniqueBy(items, getKey) {
  const seen = new Set();
  const results = [];

  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(item);
  }

  return results;
}

async function scrapeAsciiArtEu() {
  const rootHtml = await fetchText(asciiArtEuRootUrl);
  const categoryPaths = uniqueBy(
    [...rootHtml.matchAll(/href="(\/one-line\/[^"#?]+)"/g)].map((match) => match[1]),
    (value) => value
  );

  const records = [];

  for (const path of categoryPaths) {
    const categoryUrl = new URL(path, asciiArtEuRootUrl).toString();
    const categorySlug = path.split("/").pop();
    const categoryName = slugToLabel(categorySlug);
    const html = await fetchText(categoryUrl);
    const cardPattern = /<div class="card art-card[\s\S]*?<div class="art-card__ascii">([\s\S]*?)<\/div><\/div><div class="card-footer[\s\S]*?<span class="fw-normal text-truncate">([\s\S]*?)<\/span>/g;

    for (const match of html.matchAll(cardPattern)) {
      records.push(
        prepareRecord({
          source: "asciiart.eu",
          source_type: "html_category_page",
          source_url: categoryUrl,
          source_category: categoryName,
          source_category_slug: categorySlug,
          title: decodeHtmlEntities(match[2]).trim(),
          art: decodeHtmlEntities(match[1])
        })
      );
    }
  }

  return records;
}

async function scrapeOnelineAsciiArtBlogspot() {
  const html = await fetchText(onelineAsciiArtBlogUrl);
  const recordPattern = /<div class="asciiart">\s*<span class="art">([\s\S]*?)<\/span>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/g;
  const records = [];

  for (const match of html.matchAll(recordPattern)) {
    records.push(
      prepareRecord({
        source: "onelineasciiart.blogspot.com",
        source_type: "html_homepage",
        source_url: onelineAsciiArtBlogUrl,
        source_section: "homepage",
        title: decodeHtmlEntities(match[2]).trim() || null,
        art: decodeHtmlEntities(match[1])
      })
    );
  }

  return records;
}

async function scrapeAsciiArtCopy() {
  const html = await fetchText(asciiArtCopyUrl);
  const recordPattern = /<div data-type="employ" class="conceive"[^>]*>([\s\S]*?)<\/div><\/div><\/div><\/div><div class="krishna">/g;
  const records = [];

  for (const match of html.matchAll(recordPattern)) {
    const { art, title } = splitArtAndLabel(decodeHtmlEntities(match[1]));

    records.push(
      prepareRecord({
        source: "asciiartcopy.com",
        source_type: "html_homepage",
        source_url: asciiArtCopyUrl,
        source_section: "one-line-ascii-art",
        title,
        art
      })
    );
  }

  return records;
}

async function scrapeEmotesIo() {
  const html = await fetchText(emotesIoUrl);
  const recordPattern = /<div class="btn([^"]*)">\s*<span class="title">([\s\S]*?)<\/span>\s*<span class="unicode">([\s\S]*?)<\/span>\s*<\/div>/g;
  const records = [];

  for (const match of html.matchAll(recordPattern)) {
    const classNames = match[1]
      .trim()
      .split(/\s+/)
      .filter((name) => name.length > 0 && name !== "btn" && name !== "popular");

    records.push(
      prepareRecord({
        source: "emotes.io",
        source_type: "html_homepage",
        source_url: emotesIoUrl,
        source_category: classNames.length ? classNames.join(" ") : null,
        title: decodeHtmlEntities(match[2]).trim(),
        art: decodeHtmlEntities(match[3])
      })
    );
  }

  return records;
}

async function scrapeAsky() {
  const bundleUrl = "https://asky.lol/javascript/main.bundle.js";
  const bundle = await fetchText(bundleUrl);
  const entryPattern = /\{id:(\d+),title:"((?:\\.|[^"])*)",content:"((?:\\.|[^"])*)",creator:"((?:\\.|[^"])*)",creatorId:(\d+),creatorTwitter:(null|"((?:\\.|[^"])*)"),createdAt:"((?:\\.|[^"])*)"\}/g;
  const records = [];

  for (const match of bundle.matchAll(entryPattern)) {
    records.push(
      prepareRecord({
        source: "asky.lol",
        source_type: "javascript_bundle",
        source_url: bundleUrl,
        source_id: Number.parseInt(match[1], 10),
        title: decodeJsString(match[2]),
        art: decodeJsString(match[3]),
        creator: decodeJsString(match[4]),
        creator_id: Number.parseInt(match[5], 10),
        creator_twitter: match[6] === "null" ? null : decodeJsString(match[7] ?? ""),
        created_at: decodeJsString(match[8])
      })
    );
  }

  return records;
}

async function scrapeOneLineArtKulaone() {
  const jsonUrl = "https://1lineart.kulaone.com/mock/art.json";
  const items = JSON.parse(await fetchText(jsonUrl));

  return items.map((item) =>
    prepareRecord({
      source: "1lineart.kulaone.com",
      source_type: "json_feed",
      source_url: jsonUrl,
      source_id: Number.parseInt(item.nid, 10),
      source_category: item.category ?? null,
      title: item.title ?? "",
      art: item.art ?? ""
    })
  );
}

function collectMarkdownLines(blockLines, context) {
  const nonEmptyLines = blockLines
    .map((line) => line.replace(/\r/g, ""))
    .filter((line) => line.trim().length > 0);

  const looksLikeCompactMultilineBlock =
    nonEmptyLines.length > 1 &&
    nonEmptyLines.length <= 4 &&
    nonEmptyLines.some((line) => /^\s/.test(line));

  if (looksLikeCompactMultilineBlock) {
    return [];
  }

  return nonEmptyLines.map((line) =>
    prepareRecord({
      source: "gist.github.com/jamiew",
      source_type: context.sourceType,
      source_url: gistRawUrl,
      source_section: context.section,
      title: context.section,
      art: line
    })
  );
}

async function scrapeGist() {
  const markdown = await fetchText(gistRawUrl);
  const lines = markdown.split("\n");
  const records = [];

  let currentSection = "Uncategorized";
  let inFence = false;
  let fencedLines = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{2,3}\s+(.+?)\s*$/);
    if (headingMatch && !inFence) {
      currentSection = headingMatch[1].trim();
      continue;
    }

    if (line.startsWith("```")) {
      if (!inFence) {
        inFence = true;
        fencedLines = [];
      } else {
        records.push(
          ...collectMarkdownLines(fencedLines, {
            section: currentSection,
            sourceType: "markdown_fence"
          })
        );
        inFence = false;
        fencedLines = [];
      }
      continue;
    }

    if (inFence) {
      fencedLines.push(line);
      continue;
    }

    if (line.startsWith("    ")) {
      const candidate = line.slice(4).replace(/\r/g, "");
      if (!candidate.trim()) continue;
      records.push(
        prepareRecord({
          source: "gist.github.com/jamiew",
          source_type: "markdown_indent",
          source_url: gistRawUrl,
          source_section: currentSection,
          title: currentSection,
          art: candidate
        })
      );
    }
  }

  return records;
}

function buildSummary(records) {
  const uniqueArts = uniqueBy(records, (record) => normalizeWhitespaceForKey(record.art));
  const bySource = Object.entries(
    records.reduce((accumulator, record) => {
      accumulator[record.source] ??= 0;
      accumulator[record.source] += 1;
      return accumulator;
    }, {})
  )
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([source, count]) => ({ source, count }));

  return {
    generated_at: new Date().toISOString(),
    output_jsonl: "ascii_archive/data/oneline-art.jsonl",
    totals: {
      records: records.length,
      unique_art_exact: uniqueArts.length,
      ascii_only: records.filter((record) => record.ascii_only).length,
      unicode_or_extended: records.filter((record) => !record.ascii_only).length,
      probable_placeholders: records.filter((record) => record.has_placeholder).length
    },
    sources: bySource
  };
}

async function main() {
  await mkdir(dataDir, { recursive: true });

  const scrapedGroups = await Promise.all([
    scrapeAsciiArtEu(),
    scrapeOnelineAsciiArtBlogspot(),
    scrapeAsciiArtCopy(),
    scrapeEmotesIo(),
    scrapeAsky(),
    scrapeOneLineArtKulaone(),
    scrapeGist()
  ]);

  const records = scrapedGroups
    .flat()
    .filter((record) => record.line_count === 1)
    .filter((record) => record.art.trim().length > 0)
    .map((record) => ({
      fetched_at: new Date().toISOString(),
      ...record
    }));

  const jsonl = `${records.map((record) => JSON.stringify(record)).join("\n")}\n`;
  const summary = buildSummary(records);

  await writeFile(outputJsonlPath, jsonl, "utf8");
  await writeFile(outputSummaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(`Saved ${records.length} records to ${outputJsonlPath}`);
  console.log(`Saved summary to ${outputSummaryPath}`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
