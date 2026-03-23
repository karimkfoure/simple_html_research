import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const siteRoot = join(repoRoot, "_site");

const ignoredTopLevelDirs = new Set([
  ".git",
  ".github",
  "node_modules",
  "playwright-report",
  "test-results",
  "_site",
  "scripts"
]);

const ignoredNames = new Set(["AGENTS.md", "README.md"]);
const ignoredDirs = new Set(["tests", "test-results", "playwright-report"]);

async function copyFiltered(sourceDir, targetDir) {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (ignoredNames.has(entry.name)) continue;
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;

    const sourcePath = join(sourceDir, entry.name);
    const targetPath = join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyFiltered(sourcePath, targetPath);
      continue;
    }

    await cp(sourcePath, targetPath, { force: true });
  }
}

await rm(siteRoot, { recursive: true, force: true });
await mkdir(siteRoot, { recursive: true });

await cp(join(repoRoot, "index.html"), join(siteRoot, "index.html"), { force: true });

const topLevelEntries = await readdir(repoRoot, { withFileTypes: true });

for (const entry of topLevelEntries) {
  if (!entry.isDirectory()) continue;
  if (ignoredTopLevelDirs.has(entry.name)) continue;

  const experimentDir = join(repoRoot, entry.name);
  if (!existsSync(join(experimentDir, "index.html"))) continue;

  await copyFiltered(experimentDir, join(siteRoot, entry.name));
}
