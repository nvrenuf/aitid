export const EASTERN_TIME_ZONE = 'America/New_York';

const TIME_LOCALE = 'en-US';

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function createFormatter(options) {
  return new Intl.DateTimeFormat(TIME_LOCALE, {
    timeZone: EASTERN_TIME_ZONE,
    ...options,
  });
}

const easternTimeFormatter = createFormatter({
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

const easternTimestampFormatter = createFormatter({
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

const easternDateFormatter = createFormatter({
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function formatEasternTime(value = new Date()) {
  return easternTimeFormatter.format(toDate(value));
}

export function formatEasternTimestamp(value) {
  return easternTimestampFormatter.format(toDate(value));
}

export function formatEasternDate(value) {
  return easternDateFormatter.format(toDate(value));
}

export function formatEasternRefreshTimestamp(value) {
  if (!value) return 'unavailable';

  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return 'unavailable';

  return formatEasternTimestamp(date);
}
