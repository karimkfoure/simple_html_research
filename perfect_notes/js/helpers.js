export const DEFAULT_EDITOR_NAME = "Marcos";

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
