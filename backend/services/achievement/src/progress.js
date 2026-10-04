const { POINTS_PER_LEVEL } = require('./catalog');

const DAY_MS = 24 * 60 * 60 * 1000;

// Fecha YYYY-MM-DD en la zona indicada
function localDate(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);
}

// Misma lógica de la app: mismo día no cambia, ayer suma, más de un día reinicia
function nextStreak({ currentStreak, lastActiveDate }, today) {
  if (!lastActiveDate) return 1;
  const diff = daysBetween(lastActiveDate, today);
  if (diff <= 0) return Math.max(currentStreak, 1);
  if (diff === 1) return currentStreak + 1;
  return 1;
}

function levelOf(points) {
  return Math.floor(points / POINTS_PER_LEVEL) + 1;
}

function levelProgress(points) {
  return (points % POINTS_PER_LEVEL) / POINTS_PER_LEVEL;
}

module.exports = { localDate, daysBetween, nextStreak, levelOf, levelProgress };
