import { castSpell, createSpellbook, listSpells } from "./engine/core.js";
import { MAGIC_SPELL_IDS } from "./engine/spellbook.js";
import { createOpenRouterPortal, listOpenRouterFreeModels } from "./engine/openrouter-portal.js";
import {
  appendLogEntry,
  clearApiKey,
  clearLogEntries,
  exportLogEntries,
  listLogEntries,
  loadSavedApiKey,
  saveApiKey,
} from "./log-store.js";

export function createMagicEngineLab() {
  const spellbook = createSpellbook();

  const elements = {
    apiKey: document.getElementById("api-key"),
    saveKey: document.getElementById("save-key"),
    clearKey: document.getElementById("clear-key"),
    refreshModels: document.getElementById("refresh-models"),
    portalStatus: document.getElementById("portal-status"),
    existingTitles: document.getElementById("existing-titles"),
    noteCount: document.getElementById("note-count"),
    seed: document.getElementById("seed"),
    castSpell: document.getElementById("cast-spell"),
    clearResults: document.getElementById("clear-results"),
    resultEmpty: document.getElementById("result-empty"),
    resultBody: document.getElementById("result-body"),
    resultOutput: document.getElementById("result-output"),
    resultModel: document.getElementById("result-model"),
    resultTokens: document.getElementById("result-tokens"),
    resultStatus: document.getElementById("result-status"),
    modelList: document.getElementById("model-list"),
    exportLog: document.getElementById("export-log"),
    clearLog: document.getElementById("clear-log"),
    logView: document.getElementById("log-view"),
  };

  const state = {
    apiKey: loadSavedApiKey(),
    lastResult: null,
    spellbook: listSpells(spellbook),
  };

  bindEvents();
  syncInitialState();

  return {
    snapshot() {
      return {
        apiKeySaved: Boolean(state.apiKey),
        spellbook: state.spellbook,
        logs: listLogEntries(),
        lastResult: state.lastResult,
      };
    },
  };

  function bindEvents() {
    elements.saveKey.addEventListener("click", () => {
      state.apiKey = elements.apiKey.value.trim();
      if (!state.apiKey) {
        clearApiKey();
      } else {
        saveApiKey(state.apiKey);
      }
      renderPortalStatus();
    });

    elements.clearKey.addEventListener("click", () => {
      state.apiKey = "";
      elements.apiKey.value = "";
      clearApiKey();
      renderPortalStatus();
    });

    elements.refreshModels.addEventListener("click", async () => {
      await refreshModels();
    });

    elements.castSpell.addEventListener("click", async () => {
      await runSpell();
    });

    elements.clearResults.addEventListener("click", () => {
      state.lastResult = null;
      renderResult();
    });

    elements.exportLog.addEventListener("click", () => {
      exportLogEntries();
    });

    elements.clearLog.addEventListener("click", () => {
      clearLogEntries();
      renderLog();
    });
  }

  function syncInitialState() {
    elements.apiKey.value = state.apiKey;
    renderPortalStatus();
    renderResult();
    renderLog();
    renderSpellbookHint();
  }

  function renderSpellbookHint() {
    document.title = `magic_engine_lab (${state.spellbook.length} spell)`;
  }

  function renderPortalStatus(message = null) {
    if (message) {
      elements.portalStatus.textContent = message;
      return;
    }

    elements.portalStatus.textContent = state.apiKey
      ? "key guardada localmente en este navegador"
      : "sin key guardada";
  }

  function renderResult() {
    if (!state.lastResult) {
      elements.resultEmpty.hidden = false;
      elements.resultBody.hidden = true;
      elements.resultOutput.textContent = "";
      elements.resultModel.textContent = "-";
      elements.resultTokens.textContent = "-";
      elements.resultStatus.textContent = "-";
      return;
    }

    elements.resultEmpty.hidden = true;
    elements.resultBody.hidden = false;
    elements.resultOutput.textContent = state.lastResult.output;
    elements.resultModel.textContent = state.lastResult.source.model;
    elements.resultTokens.textContent = String(state.lastResult.usage?.total_tokens ?? "-");
    elements.resultStatus.textContent = "ok";
  }

  function renderResultError(message) {
    elements.resultEmpty.hidden = true;
    elements.resultBody.hidden = false;
    elements.resultOutput.textContent = message;
    elements.resultModel.textContent = "-";
    elements.resultTokens.textContent = "-";
    elements.resultStatus.textContent = "error";
  }

  function renderLog() {
    elements.logView.textContent = JSON.stringify(listLogEntries(), null, 2);
  }

  async function refreshModels() {
    if (!state.apiKey) {
      renderPortalStatus("guardá una key antes de pedir modelos free");
      return;
    }

    elements.modelList.innerHTML = "<li class=\"empty-state\">cargando...</li>";

    try {
      const models = await listOpenRouterFreeModels({ apiKey: state.apiKey });
      elements.modelList.innerHTML = "";

      for (const model of models) {
        const item = document.createElement("li");
        item.textContent = `${model.id} (${model.contextLength || "?"})`;
        elements.modelList.append(item);
      }

      appendLogEntry({
        type: "ui.free-models.loaded",
        timestamp: new Date().toISOString(),
        count: models.length,
      });
      renderLog();
      renderPortalStatus(`modelos free visibles: ${models.length}`);
    } catch (error) {
      elements.modelList.innerHTML = `<li class="empty-state">${error.message}</li>`;
      appendLogEntry({
        type: "ui.free-models.error",
        timestamp: new Date().toISOString(),
        message: error.message,
      });
      renderLog();
      renderPortalStatus(error.message);
    }
  }

  async function runSpell() {
    if (!state.apiKey) {
      renderPortalStatus("guardá una key antes de correr el spell");
      return;
    }

    const existingTitles = elements.existingTitles.value
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
    const noteCount = Number.parseInt(elements.noteCount.value || "0", 10);
    const seed = elements.seed.value.trim();

    const portal = createOpenRouterPortal({
      apiKey: state.apiKey,
      title: "simple_html_research magic_engine lab",
      onEvent(event) {
        appendLogEntry(event);
        renderLog();
      },
    });

    appendLogEntry({
      type: "ui.cast.started",
      timestamp: new Date().toISOString(),
      spellId: MAGIC_SPELL_IDS.ASCII_NOTE_TITLE,
      input: {
        existingTitles,
        noteCount,
        seed: seed || null,
      },
    });
    renderLog();

    try {
      const result = await castSpell({
        spellbook,
        spellId: MAGIC_SPELL_IDS.ASCII_NOTE_TITLE,
        input: {
          existingTitles,
          noteCount: Number.isFinite(noteCount) ? noteCount : 0,
          seed: seed || undefined,
        },
        portals: {
          openrouter: portal,
        },
      });

      state.lastResult = result;
      appendLogEntry({
        type: "ui.cast.result",
        timestamp: new Date().toISOString(),
        result,
      });
      renderResult();
      renderLog();
      renderPortalStatus(`cast ok via ${result.source.model}`);
    } catch (error) {
      state.lastResult = null;
      appendLogEntry({
        type: "ui.cast.error",
        timestamp: new Date().toISOString(),
        message: error.message,
        openRouter: error.openRouter ?? null,
      });
      renderResultError(error.message);
      renderLog();
      renderPortalStatus(error.message);
    }
  }
}
