const DEFAULT_TITLE_HINTS = Object.freeze([
  ":)",
  ":(",
  ":D",
  ":P",
  ";)",
  ";P",
  ":/",
  ":|",
  ":$",
  ":*",
  ":o",
  ":'(",
  "B)",
  "8)",
  "xD",
  "._.",
  "-.-",
  "^_^",
  "o_o",
  "u_u",
  "T_T",
  ">_<",
  "<3",
  "</3",
  ":]",
  ":[",
  ":3",
  ":>",
  ":<",
  "._)"
]);

const DEFAULT_BODY_HINTS = Object.freeze(["hola?"]);

function getRandomIndex(length) {
  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] % length;
  }

  return Math.floor(Math.random() * length);
}

function pickRandomValue(list, pickIndex) {
  return list[pickIndex(list.length)];
}

function getUniqueTitleHint(titleHints, noteList, pickIndex) {
  const usedHints = new Set(noteList.map((note) => note.titleHint).filter(Boolean));

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const first = pickRandomValue(titleHints, pickIndex);
    const second = pickRandomValue(titleHints, pickIndex);
    const hint = first === second ? first : `${first} ${second}`;

    if (!usedHints.has(hint)) {
      return hint;
    }
  }

  return `${pickRandomValue(titleHints, pickIndex)} ${pickRandomValue(titleHints, pickIndex)}`;
}

export function createStaticNoteHintSource({
  titleHints = DEFAULT_TITLE_HINTS,
  bodyHints = DEFAULT_BODY_HINTS,
  pickIndex = getRandomIndex
} = {}) {
  return {
    getTitleHint(noteList) {
      return getUniqueTitleHint(titleHints, noteList, pickIndex);
    },
    getBodyHint() {
      return pickRandomValue(bodyHints, pickIndex);
    }
  };
}

export const defaultNoteHintSource = createStaticNoteHintSource();
