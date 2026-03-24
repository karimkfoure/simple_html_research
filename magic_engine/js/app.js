import { castSpell, createSpellbook, listSpells } from "./engine/core.js";
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
    spellSelect: document.getElementById("spell-select"),
    spellDeck: document.getElementById("spell-deck"),
    existingTitles: document.getElementById("existing-titles"),
    noteCount: document.getElementById("note-count"),
    optionCount: document.getElementById("option-count"),
    seed: document.getElementById("seed"),
    phraseLabel: document.getElementById("phrase-label"),
    phrase: document.getElementById("phrase"),
    castSpell: document.getElementById("cast-spell"),
    castAllSpells: document.getElementById("cast-all-spells"),
    clearResults: document.getElementById("clear-results"),
    resultEmpty: document.getElementById("result-empty"),
    resultSummary: document.getElementById("result-summary"),
    resultList: document.getElementById("result-list"),
    modelList: document.getElementById("model-list"),
    exportLog: document.getElementById("export-log"),
    clearLog: document.getElementById("clear-log"),
    logView: document.getElementById("log-view"),
  };

  const state = {
    apiKey: loadSavedApiKey(),
    results: [],
    spellbook: listSpells(spellbook),
    selectedSpellId: null,
    isRunning: false,
  };

  bindEvents();
  syncInitialState();

  return {
    snapshot() {
      return {
        apiKeySaved: Boolean(state.apiKey),
        spellbook: state.spellbook,
        selectedSpellId: state.selectedSpellId,
        logs: listLogEntries(),
        results: state.results,
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

    elements.spellSelect.addEventListener("change", () => {
      state.selectedSpellId = elements.spellSelect.value;
      renderScenarioControls();
    });

    elements.spellDeck.addEventListener("click", (event) => {
      const button = event.target.closest("[data-spell-id]");

      if (!button) {
        return;
      }

      state.selectedSpellId = button.dataset.spellId;
      renderScenarioControls();
    });

    elements.castSpell.addEventListener("click", async () => {
      await runSelectedSpell();
    });

    elements.castAllSpells.addEventListener("click", async () => {
      await runAllSpells();
    });

    elements.clearResults.addEventListener("click", () => {
      state.results = [];
      renderResults();
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
    state.selectedSpellId = state.spellbook[0]?.id ?? null;
    elements.apiKey.value = state.apiKey;
    renderPortalStatus();
    renderSpellbookHint();
    renderSpellSelector();
    renderScenarioDeck();
    renderScenarioControls();
    renderResults();
    renderLog();
  }

  function renderSpellbookHint() {
    document.title = `magic_engine_lab (${state.spellbook.length} escenarios)`;
  }

  function renderSpellSelector() {
    elements.spellSelect.innerHTML = "";

    for (const spell of state.spellbook) {
      const option = document.createElement("option");
      option.value = spell.id;
      option.textContent = spell.label;
      if (spell.id === state.selectedSpellId) {
        option.selected = true;
      }
      elements.spellSelect.append(option);
    }
  }

  function renderScenarioDeck() {
    elements.spellDeck.innerHTML = "";

    for (const spell of state.spellbook) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = spell.id === state.selectedSpellId ? "scenario-card is-active" : "scenario-card";
      button.dataset.spellId = spell.id;

      const heading = document.createElement("strong");
      heading.textContent = spell.label;
      button.append(heading);

      const summary = document.createElement("span");
      summary.textContent = spell.summary;
      button.append(summary);

      const tagRow = document.createElement("span");
      tagRow.className = "scenario-tags";
      tagRow.textContent = spell.tags.join(" / ");
      button.append(tagRow);

      elements.spellDeck.append(button);
    }
  }

  function renderScenarioControls() {
    renderSpellSelector();
    renderScenarioDeck();

    const spell = getSelectedSpell();
    if (!spell) {
      return;
    }

    elements.phraseLabel.textContent = spell.requiresPhrase
      ? "Frase obligatoria a interpretar"
      : "Frase / escena opcional";

    if (!elements.phrase.value && spell.defaultPhrase) {
      elements.phrase.placeholder = spell.defaultPhrase;
    } else if (!spell.defaultPhrase) {
      elements.phrase.placeholder = "night train with paper ghosts";
    }
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

  function renderResults() {
    elements.resultList.innerHTML = "";

    if (state.results.length === 0) {
      elements.resultEmpty.hidden = false;
      elements.resultSummary.textContent = "";
      return;
    }

    elements.resultEmpty.hidden = true;
    const okCount = state.results.filter((result) => result.ok).length;
    elements.resultSummary.textContent = `${okCount}/${state.results.length} escenarios con salida valida`;

    for (const result of state.results) {
      const card = document.createElement("article");
      card.className = result.ok ? "result-item" : "result-item is-error";

      const header = document.createElement("div");
      header.className = "result-item-head";

      const title = document.createElement("h3");
      title.textContent = result.label;
      header.append(title);

      const status = document.createElement("span");
      status.className = "pill";
      status.textContent = result.ok ? "ok" : "error";
      header.append(status);
      card.append(header);

      const summary = document.createElement("p");
      summary.className = "result-item-summary";
      summary.textContent = result.summary;
      card.append(summary);

      if (result.ok) {
        const list = document.createElement("ol");
        list.className = "result-options";

        for (const option of normalizeOptions(result.output)) {
          const item = document.createElement("li");
          const art = document.createElement("code");
          art.textContent = option;
          item.append(art);
          list.append(item);
        }

        card.append(list);
      } else {
        const error = document.createElement("p");
        error.className = "result-error";
        error.textContent = result.error;
        card.append(error);
      }

      const meta = document.createElement("dl");
      meta.className = "result-meta";

      appendMeta(meta, "modelo", result.model ?? "-");
      appendMeta(meta, "tokens", String(result.tokens ?? "-"));
      appendMeta(meta, "estado", result.ok ? "ok" : "error");

      card.append(meta);
      elements.resultList.append(card);
    }
  }

  function appendMeta(meta, label, value) {
    const row = document.createElement("div");
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    row.append(dt, dd);
    meta.append(row);
  }

  function normalizeOptions(output) {
    if (Array.isArray(output)) {
      return output;
    }

    if (typeof output === "string" && output.trim()) {
      return [output];
    }

    return [];
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

  async function runSelectedSpell() {
    const spell = getSelectedSpell();

    if (!spell) {
      renderPortalStatus("no hay escenario activo");
      return;
    }

    await runSpellBatch([spell]);
  }

  async function runAllSpells() {
    await runSpellBatch(state.spellbook);
  }

  async function runSpellBatch(spells) {
    if (!state.apiKey) {
      renderPortalStatus("guardá una key antes de correr el spell");
      return;
    }

    const sharedInput = collectSharedInput();
    const portal = createOpenRouterPortal({
      apiKey: state.apiKey,
      title: "simple_html_research magic_engine lab",
      onEvent(event) {
        appendLogEntry(event);
        renderLog();
      },
    });

    state.results = [];
    setBusy(true);
    renderResults();

    for (const spell of spells) {
      const result = await executeSpell(spell, portal, sharedInput);
      state.results.push(result);
      renderResults();
    }

    setBusy(false);

    const okCount = state.results.filter((result) => result.ok).length;
    renderPortalStatus(`corrida lista: ${okCount}/${state.results.length} escenarios ok`);
  }

  async function executeSpell(spell, portal, sharedInput) {
    const input = buildSpellInput(spell, sharedInput);

    if (spell.requiresPhrase && !input.phrase) {
      const errorMessage = "faltó la frase obligatoria para este escenario";
      appendLogEntry({
        type: "ui.cast.error",
        timestamp: new Date().toISOString(),
        spellId: spell.id,
        message: errorMessage,
      });
      renderLog();

      return {
        spellId: spell.id,
        label: spell.label,
        summary: spell.summary,
        ok: false,
        error: errorMessage,
        model: "-",
        tokens: "-",
      };
    }

    appendLogEntry({
      type: "ui.cast.started",
      timestamp: new Date().toISOString(),
      spellId: spell.id,
      input,
    });
    renderLog();

    try {
      const result = await castSpell({
        spellbook,
        spellId: spell.id,
        input,
        portals: {
          openrouter: portal,
        },
      });

      appendLogEntry({
        type: "ui.cast.result",
        timestamp: new Date().toISOString(),
        result,
      });
      renderLog();

      return {
        spellId: spell.id,
        label: spell.label,
        summary: spell.summary,
        ok: true,
        output: result.output,
        model: result.source.model,
        tokens: result.usage?.total_tokens ?? "-",
      };
    } catch (error) {
      appendLogEntry({
        type: "ui.cast.error",
        timestamp: new Date().toISOString(),
        spellId: spell.id,
        message: error.message,
        openRouter: error.openRouter ?? null,
      });
      renderLog();

      return {
        spellId: spell.id,
        label: spell.label,
        summary: spell.summary,
        ok: false,
        error: error.message,
        model: "-",
        tokens: "-",
      };
    }
  }

  function collectSharedInput() {
    const existingTitles = elements.existingTitles.value
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
    const noteCount = Number.parseInt(elements.noteCount.value || "0", 10);
    const optionCount = Number.parseInt(elements.optionCount.value || "4", 10);
    const seed = elements.seed.value.trim();
    const phrase = elements.phrase.value.trim();

    return {
      existingTitles,
      noteCount: Number.isFinite(noteCount) ? noteCount : 0,
      optionCount: Number.isFinite(optionCount) ? optionCount : 4,
      seed,
      phrase,
    };
  }

  function buildSpellInput(spell, sharedInput) {
    const input = {
      existingTitles: sharedInput.existingTitles,
      noteCount: sharedInput.noteCount,
      optionCount: sharedInput.optionCount,
    };

    if (sharedInput.seed) {
      input.seed = sharedInput.seed;
    }

    if (sharedInput.phrase) {
      input.phrase = sharedInput.phrase;
    } else if (spell.defaultPhrase) {
      input.phrase = spell.defaultPhrase;
    }

    return input;
  }

  function getSelectedSpell() {
    return state.spellbook.find((spell) => spell.id === state.selectedSpellId) ?? null;
  }

  function setBusy(isBusy) {
    state.isRunning = isBusy;
    elements.castSpell.disabled = isBusy;
    elements.castAllSpells.disabled = isBusy;
    elements.refreshModels.disabled = isBusy;
  }
}
