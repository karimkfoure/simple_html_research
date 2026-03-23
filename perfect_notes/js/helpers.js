export const DEFAULT_EDITOR_NAME = "Marcos";

const argentinaDateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Argentina/Cordoba",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const titleHints = [
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
];

const emptyBodyHints = ["hola?"];

export function formatNoteStamp(note) {
  const parts = Object.fromEntries(
    argentinaDateTime.formatToParts(new Date(note.updatedAt)).map((part) => [part.type, part.value])
  );

  return `${note.updatedBy} - ${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

export function getNextTitleHint(noteList) {
  const usedHints = new Set(noteList.map((note) => note.titleHint).filter(Boolean));

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const first = titleHints[randomIndex(titleHints.length)];
    const second = titleHints[randomIndex(titleHints.length)];
    const hint = first === second ? first : `${first} ${second}`;

    if (!usedHints.has(hint)) {
      return hint;
    }
  }

  return `${titleHints[randomIndex(titleHints.length)]} ${titleHints[randomIndex(titleHints.length)]}`;
}

export function getNextBodyHint() {
  return emptyBodyHints[randomIndex(emptyBodyHints.length)];
}

export function randomIndex(length) {
  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] % length;
  }

  return Math.floor(Math.random() * length);
}

export function getLineInfo(value, position) {
  const lines = value.split("\n");
  let remaining = position;

  for (let index = 0; index < lines.length; index += 1) {
    const lineLength = lines[index].length;

    if (remaining <= lineLength) {
      return { lines, lineIndex: index, column: remaining };
    }

    remaining -= lineLength + 1;
  }

  const lastIndex = lines.length - 1;
  return { lines, lineIndex: lastIndex, column: lines[lastIndex].length };
}

export function getCaretPositionForLine(value, lineIndex, column) {
  const lines = value.split("\n");
  const clampedLine = Math.max(0, Math.min(lineIndex, lines.length - 1));
  let position = 0;

  for (let index = 0; index < clampedLine; index += 1) {
    position += lines[index].length + 1;
  }

  return position + Math.min(column, lines[clampedLine].length);
}
