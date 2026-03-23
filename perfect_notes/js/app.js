import {
  canIndent,
  createState,
  deleteBlock,
  deleteNote,
  findBlock,
  findNote,
  getBlockOrder,
  getUnpinnedInsertIndex,
  indentBlock,
  initializeState,
  insertNoteAt,
  noteHasBodyContent,
  outdentBlock,
  splitTextBlockOnDoubleEnter,
  toggleBlockDone,
  togglePin,
  updateBlockText,
  updateTitle,
  addCheckFromCurrentLine,
  exitChecklist,
  ensureNoteHasBlock
} from "./model.js";
import { getCaretPositionForLine, getLineInfo } from "./helpers.js";
import { formatNoteStamp } from "./timestamp.js";

const STAMP_REFRESH_INTERVAL_MS = 30 * 1000;

export function createPerfectNotesApp({ document, window }) {
  const notesEl = document.querySelector("#notes");
  const noteTemplate = document.querySelector("#note-template");
  const blockTemplate = document.querySelector("#block-template");
  const insertNoteButton = document.querySelector('[data-action="insert-note"]');
  const titleMeasureCanvas = document.createElement("canvas");
  const titleMeasureContext = titleMeasureCanvas.getContext("2d");
  const state = createState();

  initializeState(state);
  state.selectedNoteId = state.notes[0].id;
  state.selectedBlockId = state.notes[0].blocks[0].id;

  function autoSize(textarea) {
    if (textarea.classList.contains("note-title")) {
      const fieldset = textarea.closest("fieldset");
      const computed = getComputedStyle(textarea);
      const source = textarea.value || textarea.placeholder || "";
      const longestLine = source.split("\n").reduce((longest, line) => {
        return line.length > longest.length ? line : longest;
      }, " ");
      const maxWidth = Math.max(16, Math.floor((fieldset?.clientWidth || 0) / 2));

      if (titleMeasureContext) {
        titleMeasureContext.font = computed.font;
        const measured = Math.ceil(titleMeasureContext.measureText(longestLine).width) + 12;
        textarea.style.width = `${Math.min(Math.max(16, measured), maxWidth)}px`;
        textarea.style.maxWidth = `${maxWidth}px`;
      }
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 38)}px`;
  }

  function focusTextarea(textarea, position = null) {
    if (!textarea) {
      return;
    }

    const viewport = { x: window.scrollX, y: window.scrollY };

    try {
      textarea.focus({ preventScroll: true });
    } catch (error) {
      textarea.focus();
    }

    if (position !== null) {
      textarea.setSelectionRange(position, position);
    }

    autoSize(textarea);
    window.scrollTo(viewport.x, viewport.y);
    requestAnimationFrame(() => {
      window.scrollTo(viewport.x, viewport.y);
    });
  }

  function scheduleTextareaFocus(selector, position = null) {
    const applyFocus = () => {
      const textarea = document.querySelector(selector);

      if (!textarea) {
        return false;
      }

      const resolvedPosition = typeof position === "function" ? position(textarea) : position;
      focusTextarea(textarea, resolvedPosition);
      return true;
    };

    if (applyFocus()) {
      return;
    }

    requestAnimationFrame(() => {
      applyFocus();
    });
  }

  function focusTitle(noteId, position) {
    scheduleTextareaFocus(`.note-wrap[data-note-id="${noteId}"] .note-title`, position);
  }

  function focusBlock(noteId, blockId, position = null) {
    scheduleTextareaFocus(`.block[data-note-id="${noteId}"][data-block-id="${blockId}"] .block-text`, position);
  }

  function syncSelection() {
    document.querySelectorAll(".note-wrap[data-note-id]").forEach((noteEl) => {
      noteEl.dataset.selected = String(Number(noteEl.dataset.noteId) === state.selectedNoteId);
    });

    document.querySelectorAll(".block[data-block-id]").forEach((blockEl) => {
      blockEl.dataset.selected = String(Number(blockEl.dataset.blockId) === state.selectedBlockId);
    });
  }

  function renderBlocks(noteId, blocks, target, depth = 0, emptyPlaceholderBlockId = null, emptyPlaceholderText = "") {
    target.textContent = "";

    for (const block of blocks) {
      const fragment = blockTemplate.content.cloneNode(true);
      const blockEl = fragment.querySelector(".block");
      const row = fragment.querySelector(".block-row");
      const checkbox = fragment.querySelector('input[type="checkbox"]');
      const textarea = fragment.querySelector(".block-text");
      const childrenEl = fragment.querySelector(".children");
      const addCheckButton = fragment.querySelector('[data-action="add-check"]');
      const indentButton = fragment.querySelector('[data-action="indent"]');
      const outdentButton = fragment.querySelector('[data-action="outdent"]');

      blockEl.dataset.noteId = noteId;
      blockEl.dataset.blockId = block.id;
      blockEl.dataset.type = block.type;
      blockEl.dataset.done = String(block.done);
      blockEl.dataset.selected = String(block.id === state.selectedBlockId);

      textarea.value = block.text;
      textarea.placeholder =
        block.id === emptyPlaceholderBlockId && block.type === "text" ? emptyPlaceholderText : "";

      if (block.type === "text") {
        row.querySelector(".toggle")?.remove();
        childrenEl.remove();
        addCheckButton.hidden = false;
        indentButton.hidden = true;
        outdentButton.hidden = true;
      } else {
        checkbox.checked = block.done;
        addCheckButton.hidden = true;
        indentButton.hidden = !canIndent(state, noteId, block.id);
        outdentButton.hidden = depth === 0;
        renderBlocks(noteId, block.children, childrenEl, depth + 1, emptyPlaceholderBlockId, emptyPlaceholderText);
      }

      target.append(fragment);
    }
  }

  function refreshStamps(currentDate = new Date()) {
    document.querySelectorAll(".note-wrap[data-note-id]").forEach((noteEl) => {
      const noteId = Number(noteEl.dataset.noteId);
      const note = findNote(state, noteId);
      const stamp = noteEl.querySelector(".note-stamp");

      if (!note || !stamp) {
        return;
      }

      stamp.textContent = formatNoteStamp(note.note, currentDate);
    });
  }

  function render() {
    const viewport = { x: window.scrollX, y: window.scrollY };

    initializeState(state);

    if (!findNote(state, state.selectedNoteId)) {
      state.selectedNoteId = state.notes[0].id;
    }

    notesEl.textContent = "";

    for (const note of state.notes) {
      const fragment = noteTemplate.content.cloneNode(true);
      const wrap = fragment.querySelector(".note-wrap");
      const title = fragment.querySelector(".note-title");
      const blocksEl = fragment.querySelector(".blocks");
      const stamp = fragment.querySelector(".note-stamp");
      const pinButton = fragment.querySelector('[data-action="toggle-pin"]');
      const deleteButton = fragment.querySelector('[data-action="delete-note"]');
      const emptyPlaceholderBlockId = noteHasBodyContent(note.blocks) ? null : note.blocks[0]?.id ?? null;

      wrap.dataset.noteId = note.id;
      wrap.dataset.selected = String(note.id === state.selectedNoteId);
      wrap.dataset.pinned = String(note.pinned);

      title.value = note.title;
      title.placeholder = note.titleHint;

      stamp.textContent = formatNoteStamp(note);

      pinButton.setAttribute("aria-pressed", String(note.pinned));
      pinButton.setAttribute("aria-label", note.pinned ? "Despinear nota" : "Pinear nota");
      pinButton.textContent = note.pinned ? "despinear" : "pinear";

      deleteButton.setAttribute("aria-label", "Borrar nota");
      deleteButton.textContent = "borrar";
      deleteButton.hidden = note.pinned;

      renderBlocks(note.id, note.blocks, blocksEl, 0, emptyPlaceholderBlockId, note.bodyHint);
      notesEl.append(fragment);
    }

    document.querySelectorAll("textarea").forEach(autoSize);
    syncSelection();
    window.scrollTo(viewport.x, viewport.y);
  }

  function moveVertical(noteId, blockId, direction, textarea) {
    if (textarea.selectionStart !== textarea.selectionEnd) {
      return false;
    }

    const lineInfo = getLineInfo(textarea.value, textarea.selectionStart);

    if (direction === "up" && lineInfo.lineIndex !== 0) {
      return false;
    }

    if (direction === "down" && lineInfo.lineIndex !== lineInfo.lines.length - 1) {
      return false;
    }

    const orderedIds = getBlockOrder(state, noteId);
    const currentIndex = orderedIds.indexOf(blockId);
    const targetId = orderedIds[currentIndex + (direction === "up" ? -1 : 1)];

    if (!targetId && direction === "up" && currentIndex === 0) {
      const note = findNote(state, noteId);

      if (!note) {
        return false;
      }

      state.selectedNoteId = noteId;
      state.selectedBlockId = null;
      render();
      focusTitle(
        noteId,
        getCaretPositionForLine(note.note.title, note.note.title.split("\n").length - 1, lineInfo.column)
      );
      return true;
    }

    if (!targetId) {
      return false;
    }

    const target = findBlock(state, noteId, targetId);

    if (!target) {
      return false;
    }

    state.selectedNoteId = noteId;
    state.selectedBlockId = targetId;
    render();
    focusBlock(noteId, targetId, getCaretPositionForLine(target.block.text, direction === "up" ? target.block.text.split("\n").length - 1 : 0, lineInfo.column));
    return true;
  }

  function handleTitleEnter(event, title) {
    if (event.key !== "Enter" || event.shiftKey) {
      return false;
    }

    const noteId = Number(title.closest(".note-wrap").dataset.noteId);
    const note = findNote(state, noteId);

    if (!note) {
      return false;
    }

    event.preventDefault();
    ensureNoteHasBlock(state, note.note);
    state.selectedNoteId = noteId;
    state.selectedBlockId = note.note.blocks[0].id;
    render();
    focusBlock(noteId, note.note.blocks[0].id, null);
    return true;
  }

  function handleTitleArrows(event, title) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return false;
    }

    const noteId = Number(title.closest(".note-wrap").dataset.noteId);
    const note = findNote(state, noteId);

    if (!note) {
      return false;
    }

    const lineInfo = getLineInfo(title.value, title.selectionStart);
    const isMovingDown = event.key === "ArrowDown";
    const onEdge = isMovingDown ? lineInfo.lineIndex === lineInfo.lines.length - 1 : lineInfo.lineIndex === 0;

    if (!onEdge || !note.note.blocks.length || !isMovingDown) {
      return false;
    }

    event.preventDefault();
    state.selectedNoteId = noteId;
    state.selectedBlockId = note.note.blocks[0].id;
    render();
    focusBlock(noteId, note.note.blocks[0].id, getCaretPositionForLine(note.note.blocks[0].text, 0, lineInfo.column));
    return true;
  }

  function handleBlockKeydown(event, textarea) {
    const blockEl = textarea.closest(".block");
    const noteId = Number(blockEl.dataset.noteId);
    const blockId = Number(blockEl.dataset.blockId);
    const found = findBlock(state, noteId, blockId);

    if (!found) {
      return;
    }

    if ((event.key === "ArrowUp" || event.key === "ArrowDown") && moveVertical(noteId, blockId, event.key === "ArrowUp" ? "up" : "down", textarea)) {
      event.preventDefault();
      return;
    }

    if (event.key === "Tab" && found.block.type === "check") {
      event.preventDefault();

      const movedBlock = event.shiftKey ? outdentBlock(state, noteId, blockId) : indentBlock(state, noteId, blockId);

      if (!movedBlock) {
        return;
      }

      state.selectedNoteId = noteId;
      state.selectedBlockId = movedBlock.id;
      render();
      focusBlock(noteId, movedBlock.id, textarea.selectionStart);
      return;
    }

    if (event.key === "Enter" && !event.shiftKey && found.block.type === "check") {
      event.preventDefault();

      const targetBlock =
        textarea.value.trim() === "" ? exitChecklist(state, noteId, blockId) : addCheckFromCurrentLine(state, noteId, blockId);

      if (!targetBlock) {
        return;
      }

      state.selectedNoteId = noteId;
      state.selectedBlockId = targetBlock.id;
      render();
      focusBlock(noteId, targetBlock.id, textarea.value.trim() === "" ? null : 0);
      return;
    }

    if (event.key === "Backspace" && textarea.value === "") {
      event.preventDefault();
      const targetBlockId = deleteBlock(state, noteId, blockId);

      if (targetBlockId === null) {
        return;
      }

      state.selectedNoteId = noteId;
      state.selectedBlockId = targetBlockId;
      render();
      focusBlock(noteId, targetBlockId, (current) => current.value.length);
    }
  }

  function handleAction(action, noteId, blockId = null) {
    if (action === "toggle-pin") {
      const note = findNote(state, noteId);

      if (!note || !window.confirm(`${note.note.pinned ? "Despinear" : "Pinear"} esta nota?`)) {
        return;
      }

      const updated = togglePin(state, noteId);

      if (!updated) {
        return;
      }

      state.selectedNoteId = updated.id;
      render();
      return;
    }

    if (action === "delete-note") {
      const note = findNote(state, noteId);

      if (!note || note.note.pinned || !window.confirm("Borrar esta nota?")) {
        return;
      }

      const fallback = deleteNote(state, noteId);

      if (!fallback) {
        return;
      }

      state.selectedNoteId = fallback.noteId;
      state.selectedBlockId = fallback.blockId;
      render();

      if (fallback.blockId !== null) {
        focusBlock(fallback.noteId, fallback.blockId, null);
      }

      return;
    }

    if (blockId === null) {
      return;
    }

    if (action === "add-check") {
      const block = addCheckFromCurrentLine(state, noteId, blockId);

      if (!block) {
        return;
      }

      state.selectedNoteId = noteId;
      state.selectedBlockId = block.id;
      render();
      focusBlock(noteId, block.id, (textarea) => textarea.value.length);
      return;
    }

    if (action === "indent" || action === "outdent") {
      const movedBlock = action === "indent" ? indentBlock(state, noteId, blockId) : outdentBlock(state, noteId, blockId);

      if (!movedBlock) {
        return;
      }

      state.selectedNoteId = noteId;
      state.selectedBlockId = movedBlock.id;
      render();
      focusBlock(noteId, movedBlock.id, (textarea) => textarea.value.length);
    }
  }

  notesEl.addEventListener("focusin", (event) => {
    const noteWrap = event.target.closest(".note-wrap");

    if (!noteWrap) {
      return;
    }

    state.selectedNoteId = Number(noteWrap.dataset.noteId);

    const blockEl = event.target.closest(".block");
    const footerAction = event.target.closest(".note-footer-actions");
    state.selectedBlockId = blockEl ? Number(blockEl.dataset.blockId) : footerAction ? state.selectedBlockId : null;
    syncSelection();
  });

  notesEl.addEventListener("input", (event) => {
    const textarea = event.target.closest("textarea");

    if (!textarea) {
      return;
    }

    const noteWrap = textarea.closest(".note-wrap");
    const noteId = Number(noteWrap.dataset.noteId);

    if (textarea.classList.contains("note-title")) {
      updateTitle(state, noteId, textarea.value);
      state.selectedNoteId = noteId;
      state.selectedBlockId = null;
      autoSize(textarea);
      syncSelection();
      return;
    }

    const blockEl = textarea.closest(".block");
    const blockId = Number(blockEl.dataset.blockId);

    if (!updateBlockText(state, noteId, blockId, textarea.value)) {
      return;
    }

    state.selectedNoteId = noteId;
    state.selectedBlockId = blockId;

    const newBlock = splitTextBlockOnDoubleEnter(state, noteId, blockId, textarea.value, textarea.selectionStart);
    if (newBlock) {
      state.selectedBlockId = newBlock.id;
      render();
      focusBlock(noteId, newBlock.id, 0);
      return;
    }

    autoSize(textarea);
    syncSelection();
  });

  notesEl.addEventListener("change", (event) => {
    const checkbox = event.target.closest('input[type="checkbox"]');

    if (!checkbox) {
      return;
    }

    const blockEl = checkbox.closest(".block");
    const noteId = Number(blockEl.dataset.noteId);
    const blockId = Number(blockEl.dataset.blockId);

    if (!toggleBlockDone(state, noteId, blockId, checkbox.checked)) {
      return;
    }

    blockEl.dataset.done = String(checkbox.checked);
    state.selectedNoteId = noteId;
    state.selectedBlockId = blockId;
    syncSelection();
  });

  notesEl.addEventListener("keydown", (event) => {
    const title = event.target.closest(".note-title");

    if (title) {
      if (handleTitleEnter(event, title)) {
        return;
      }

      handleTitleArrows(event, title);
      return;
    }

    const textarea = event.target.closest(".block-text");

    if (textarea) {
      handleBlockKeydown(event, textarea);
    }
  });

  notesEl.addEventListener("click", (event) => {
    const noteWrap = event.target.closest(".note-wrap");

    if (!noteWrap) {
      return;
    }

    const noteId = Number(noteWrap.dataset.noteId);
    const blockEl = event.target.closest(".block");
    const button = event.target.closest("button[data-action]");

    state.selectedNoteId = noteId;

    if (blockEl) {
      state.selectedBlockId = Number(blockEl.dataset.blockId);
    }

    syncSelection();

    if (!button) {
      return;
    }

    handleAction(button.dataset.action, noteId, blockEl ? Number(blockEl.dataset.blockId) : null);
  });

  insertNoteButton.addEventListener("click", () => {
    const newNote = insertNoteAt(state, getUnpinnedInsertIndex(state));
    state.selectedNoteId = newNote.id;
    state.selectedBlockId = newNote.blocks[0].id;
    render();
    focusBlock(newNote.id, newNote.blocks[0].id, null);
  });

  window.addEventListener("resize", () => {
    document.querySelectorAll("textarea").forEach(autoSize);
  });

  window.__perfectNotesTest = {
    snapshot() {
      return JSON.parse(
        JSON.stringify({
          notes: state.notes,
          selectedNoteId: state.selectedNoteId,
          selectedBlockId: state.selectedBlockId
        })
      );
    },
    setNoteUpdatedAt(noteId, updatedAt) {
      const note = findNote(state, noteId);

      if (!note) {
        return false;
      }

      note.note.updatedAt = updatedAt;
      refreshStamps();
      return true;
    }
  };

  render();
  window.setInterval(() => {
    refreshStamps();
  }, STAMP_REFRESH_INTERVAL_MS);

  return {
    render,
    snapshot: window.__perfectNotesTest.snapshot
  };
}
