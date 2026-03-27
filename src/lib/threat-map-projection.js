const MIN_X_PERCENT = 6;
const MAX_X_PERCENT = 94;
const MIN_Y_PERCENT = 10;
const MAX_Y_PERCENT = 90;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function projectThreatMapAnchor(anchor) {
  const rawX = ((anchor.lng + 180) / 360) * 100;
  const rawY = ((90 - anchor.lat) / 180) * 100;

  return {
    x: clamp(rawX, MIN_X_PERCENT, MAX_X_PERCENT),
    y: clamp(rawY, MIN_Y_PERCENT, MAX_Y_PERCENT),
  };
}
