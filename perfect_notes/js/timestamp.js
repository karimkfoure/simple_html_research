const ARGENTINA_TIME_ZONE = "America/Argentina/Cordoba";
const SECOND_IN_MS = 1000;
const MINUTE_IN_MS = 60 * SECOND_IN_MS;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;

const argentinaDateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: ARGENTINA_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const argentinaDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: ARGENTINA_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const relativeTime = new Intl.RelativeTimeFormat("es", { numeric: "always" });
const relativeDay = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

export function formatNoteStamp(note, currentDate = new Date()) {
  return `${note.updatedBy} - ${formatHumanTimestamp(note.updatedAt, currentDate)}`;
}

function formatHumanTimestamp(value, currentDate = new Date()) {
  const targetDate = new Date(value);

  if (Number.isNaN(targetDate.getTime())) {
    return "";
  }

  const diffMs = targetDate.getTime() - currentDate.getTime();
  const absDiffMs = Math.abs(diffMs);

  if (absDiffMs < 5 * SECOND_IN_MS) {
    return "ahora";
  }

  if (absDiffMs < MINUTE_IN_MS) {
    return relativeTime.format(Math.round(diffMs / SECOND_IN_MS), "second");
  }

  if (absDiffMs < HOUR_IN_MS) {
    return relativeTime.format(Math.round(diffMs / MINUTE_IN_MS), "minute");
  }

  if (absDiffMs < DAY_IN_MS) {
    return relativeTime.format(Math.round(diffMs / HOUR_IN_MS), "hour");
  }

  const dayDiff = getArgentinaDayDiff(targetDate, currentDate);

  if (dayDiff === -1 || dayDiff === 1) {
    return relativeDay.format(dayDiff, "day");
  }

  return formatAbsoluteTimestamp(targetDate);
}

function formatAbsoluteTimestamp(value) {
  const targetDate = new Date(value);

  if (Number.isNaN(targetDate.getTime())) {
    return "";
  }

  const parts = toPartMap(argentinaDateTime, targetDate);
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

function getArgentinaDayDiff(leftDate, rightDate) {
  const leftParts = toPartMap(argentinaDay, leftDate);
  const rightParts = toPartMap(argentinaDay, rightDate);
  const leftUtc = Date.UTC(Number(leftParts.year), Number(leftParts.month) - 1, Number(leftParts.day));
  const rightUtc = Date.UTC(Number(rightParts.year), Number(rightParts.month) - 1, Number(rightParts.day));
  return Math.round((leftUtc - rightUtc) / DAY_IN_MS);
}

function toPartMap(formatter, value) {
  return Object.fromEntries(formatter.formatToParts(value).map((part) => [part.type, part.value]));
}
