import { DEFAULT_EDITOR_NAME } from "./helpers.js";
import { defaultNoteHintSource } from "./note-hint-source.js";

export function createState({ noteHintSource = defaultNoteHintSource } = {}) {
  return {
    nextNoteId: 1,
    nextBlockId: 1,
    selectedNoteId: null,
    selectedBlockId: null,
    notes: [],
    noteHintSource
  };
}

export function initializeState(state) {
  if (!state.notes.length) {
    state.notes.push(createNote(state));
  }
}

function createNote(state, { title = "", blocks = null } = {}) {
  return {
    id: state.nextNoteId++,
    title,
    blocks: blocks ?? [createBlock(state, "text")],
    titleHint: state.noteHintSource.getTitleHint(state.notes),
    bodyHint: state.noteHintSource.getBodyHint(),
    pinned: false,
    updatedBy: DEFAULT_EDITOR_NAME,
    updatedAt: new Date().toISOString()
  };
}

function createBlock(state, type = "text", text = "", done = false, children = []) {
  return {
    id: state.nextBlockId++,
    type,
    text,
    done,
    children
  };
}

export function findNote(state, noteId) {
  const index = state.notes.findIndex((note) => note.id === noteId);

  if (index === -1) {
    return null;
  }

  return {
    note: state.notes[index],
    index,
    list: state.notes
  };
}

export function findBlock(state, noteId, blockId, list = null, parentBlock = null) {
  const blocks = list ?? findNote(state, noteId)?.note.blocks;

  if (!blocks) {
    return null;
  }

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];

    if (block.id === blockId) {
      return { block, index, list: blocks, parentBlock };
    }

    const found = findBlock(state, noteId, blockId, block.children, block);
    if (found) {
      return found;
    }
  }

  return null;
}

export function getUnpinnedInsertIndex(state) {
  for (let index = 0; index < state.notes.length; index += 1) {
    if (!state.notes[index].pinned) {
      return index;
    }
  }

  return state.notes.length;
}

function stampNote(note) {
  note.updatedAt = new Date().toISOString();
  note.updatedBy = DEFAULT_EDITOR_NAME;
}

export function touchNote(state, noteId) {
  const found = findNote(state, noteId);

  if (found) {
    stampNote(found.note);
  }
}

function flattenBlockIds(list, output = []) {
  for (const block of list) {
    output.push(block.id);
    flattenBlockIds(block.children, output);
  }

  return output;
}

export function getBlockOrder(state, noteId) {
  const found = findNote(state, noteId);
  return found ? flattenBlockIds(found.note.blocks, []) : [];
}

export function noteHasBodyContent(blocks) {
  for (const block of blocks) {
    if (block.type === "check") {
      return true;
    }

    if (block.text.trim() !== "") {
      return true;
    }

    if (noteHasBodyContent(block.children)) {
      return true;
    }
  }

  return false;
}

export function ensureNoteHasBlock(state, note) {
  if (!note.blocks.length) {
    note.blocks.push(createBlock(state, "text"));
  }
}

export function canIndent(state, noteId, blockId) {
  const found = findBlock(state, noteId, blockId);

  if (!found || found.block.type !== "check" || found.index === 0) {
    return false;
  }

  return found.list[found.index - 1].type === "check";
}

export function insertBlockBelow(state, noteId, blockId, type, text = "") {
  const found = findBlock(state, noteId, blockId);

  if (!found) {
    return null;
  }

  const newBlock = createBlock(state, type, text);
  found.list.splice(found.index + 1, 0, newBlock);
  touchNote(state, noteId);
  return newBlock;
}

function turnIntoCheck(state, noteId, blockId) {
  const found = findBlock(state, noteId, blockId);

  if (!found || found.block.type !== "text") {
    return null;
  }

  found.block.type = "check";
  found.block.done = false;
  found.block.children = [];
  touchNote(state, noteId);
  return found.block;
}

export function addCheckFromCurrentLine(state, noteId, blockId) {
  const found = findBlock(state, noteId, blockId);

  if (!found) {
    return null;
  }

  if (found.block.type === "text" && found.block.text.trim() === "") {
    return turnIntoCheck(state, noteId, blockId);
  }

  return insertBlockBelow(state, noteId, blockId, "check");
}

export function splitTextBlockOnDoubleEnter(state, noteId, blockId, value, caretPosition) {
  const splitIndex = value.lastIndexOf("\n\n", Math.max(0, caretPosition - 1));

  if (splitIndex === -1) {
    return null;
  }

  const found = findBlock(state, noteId, blockId);

  if (!found || found.block.type !== "text") {
    return null;
  }

  const newBlock = createBlock(state, "text", value.slice(splitIndex + 2));
  found.block.text = value.slice(0, splitIndex);
  found.list.splice(found.index + 1, 0, newBlock);
  touchNote(state, noteId);
  return newBlock;
}

export function indentBlock(state, noteId, blockId) {
  const found = findBlock(state, noteId, blockId);

  if (!found || !canIndent(state, noteId, blockId)) {
    return null;
  }

  const previous = found.list[found.index - 1];
  const [block] = found.list.splice(found.index, 1);
  previous.children.push(block);
  touchNote(state, noteId);
  return block;
}

export function outdentBlock(state, noteId, blockId) {
  const found = findBlock(state, noteId, blockId);

  if (!found || !found.parentBlock) {
    return null;
  }

  const [block] = found.list.splice(found.index, 1);
  const parent = findBlock(state, noteId, found.parentBlock.id);

  if (!parent) {
    return null;
  }

  parent.list.splice(parent.index + 1, 0, block);
  touchNote(state, noteId);
  return block;
}

export function exitChecklist(state, noteId, blockId) {
  const found = findBlock(state, noteId, blockId);

  if (!found || found.block.type !== "check") {
    return null;
  }

  if (found.parentBlock) {
    return outdentBlock(state, noteId, blockId);
  }

  found.block.type = "text";
  found.block.done = false;

  if (found.block.children.length) {
    found.list.splice(found.index + 1, 0, ...found.block.children);
    found.block.children = [];
  }

  touchNote(state, noteId);
  return found.block;
}

export function updateTitle(state, noteId, value) {
  const found = findNote(state, noteId);

  if (!found) {
    return null;
  }

  found.note.title = value;
  touchNote(state, noteId);
  return found.note;
}

export function updateBlockText(state, noteId, blockId, value) {
  const found = findBlock(state, noteId, blockId);

  if (!found) {
    return null;
  }

  found.block.text = value;
  touchNote(state, noteId);
  return found.block;
}

export function toggleBlockDone(state, noteId, blockId, done) {
  const found = findBlock(state, noteId, blockId);

  if (!found) {
    return null;
  }

  found.block.done = done;
  touchNote(state, noteId);
  return found.block;
}

export function deleteBlock(state, noteId, blockId) {
  const noteRef = findNote(state, noteId);
  const found = findBlock(state, noteId, blockId);

  if (!noteRef || !found) {
    return null;
  }

  const orderedIds = flattenBlockIds(noteRef.note.blocks, []);
  const currentIndex = orderedIds.indexOf(blockId);
  const previousId = currentIndex > 0 ? orderedIds[currentIndex - 1] : null;
  const nextId = currentIndex >= 0 ? orderedIds[currentIndex + 1] ?? null : null;

  if (found.list === noteRef.note.blocks && found.list.length === 1 && found.block.type === "text") {
    found.block.text = "";
    touchNote(state, noteId);
    return found.block.id;
  }

  found.list.splice(found.index, 1);
  ensureNoteHasBlock(state, noteRef.note);
  touchNote(state, noteId);
  return previousId ?? nextId ?? noteRef.note.blocks[0].id;
}

export function insertNoteAt(state, insertIndex) {
  const newNote = createNote(state);
  state.notes.splice(insertIndex, 0, newNote);
  return newNote;
}

export function togglePin(state, noteId) {
  const found = findNote(state, noteId);

  if (!found) {
    return null;
  }

  const [note] = found.list.splice(found.index, 1);
  note.pinned = !note.pinned;
  stampNote(note);

  if (note.pinned) {
    state.notes.unshift(note);
  } else {
    state.notes.splice(getUnpinnedInsertIndex(state), 0, note);
  }

  return note;
}

export function deleteNote(state, noteId) {
  const found = findNote(state, noteId);

  if (!found || found.note.pinned) {
    return null;
  }

  found.list.splice(found.index, 1);

  if (!state.notes.length) {
    const newNote = createNote(state);
    state.notes.push(newNote);
    return {
      noteId: newNote.id,
      blockId: newNote.blocks[0].id
    };
  }

  const fallbackNote = state.notes[Math.min(found.index, state.notes.length - 1)];
  ensureNoteHasBlock(state, fallbackNote);

  return {
    noteId: fallbackNote.id,
    blockId: fallbackNote.blocks[0]?.id ?? null
  };
}
