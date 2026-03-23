const KEY_STORAGE_KEY = "magic-engine-lab.api-key";
const LOG_STORAGE_KEY = "magic-engine-lab.logs";
const MAX_LOG_ENTRIES = 250;

export function loadSavedApiKey() {
  return localStorage.getItem(KEY_STORAGE_KEY) || "";
}

export function saveApiKey(value) {
  localStorage.setItem(KEY_STORAGE_KEY, value);
}

export function clearApiKey() {
  localStorage.removeItem(KEY_STORAGE_KEY);
}

export function listLogEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendLogEntry(entry) {
  const entries = listLogEntries();
  entries.push(entry);
  const trimmed = entries.slice(-MAX_LOG_ENTRIES);
  localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function clearLogEntries() {
  localStorage.removeItem(LOG_STORAGE_KEY);
  return [];
}

export function exportLogEntries() {
  const jsonl = listLogEntries()
    .map((entry) => JSON.stringify(entry))
    .join("\n");
  const blob = new Blob([jsonl], { type: "application/jsonl;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `magic-engine-log-${new Date().toISOString().slice(0, 19)}.jsonl`;
  anchor.click();
  URL.revokeObjectURL(url);
}
