// ---------------------------------------------------------------------------
// Dynamic Pricing Engine
// ---------------------------------------------------------------------------

const FIXED_HOLIDAYS = [
  { month: 1,  day: 1,  name: "New Year's Day" },
  { month: 7,  day: 4,  name: 'Independence Day' },
  { month: 12, day: 25, name: 'Christmas Day' },
];

function nthWeekdayOfMonth(year, month, weekday, n) {
  const first = new Date(year, month - 1, 1);
  const diff = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month - 1, 1 + diff + (n - 1) * 7);
}

function lastWeekdayOfMonth(year, month, weekday) {
  const last = new Date(year, month, 0);
  return new Date(year, month - 1, last.getDate() - (last.getDay() - weekday + 7) % 7);
}

function getFloatingHolidays(year) {
  return [
    { date: nthWeekdayOfMonth(year, 1, 1, 3),  name: 'Martin Luther King Jr. Day' },
    { date: nthWeekdayOfMonth(year, 2, 1, 3),  name: "Presidents' Day" },
    { date: lastWeekdayOfMonth(year, 5, 1),     name: 'Memorial Day' },
    { date: nthWeekdayOfMonth(year, 9, 1, 1),  name: 'Labor Day' },
    { date: nthWeekdayOfMonth(year, 11, 4, 4), name: 'Thanksgiving' },
  ];
}

export function checkHoliday(date) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const day   = d.getDate();
  const year  = d.getFullYear();

  for (const h of FIXED_HOLIDAYS) {
    if (h.month === month && h.day === day) return { isHoliday: true, name: h.name };
  }
  for (const h of getFloatingHolidays(year)) {
    if (h.date.getFullYear() === year && h.date.getMonth() + 1 === month && h.date.getDate() === day) {
      return { isHoliday: true, name: h.name };
    }
  }
  return { isHoliday: false, name: null };
}

export function isWeekend(date) {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
}

export function isPeakSeason(date) {
  const d     = new Date(date);
  const month = d.getMonth() + 1;
  const day   = d.getDate();
  if (month >= 6 && month <= 8) return true;
  if (month === 12 && day >= 20) return true;
  if (month === 1  && day <= 3)  return true;
  return false;
}

export function getDemandMultiplier(occupancyRate) {
  return Number((Math.max(0, Math.min(1, occupancyRate)) * 0.15).toFixed(4));
}

export function calculateDynamicPrice(basePrice, { date, occupancyRate = 0 } = {}) {
  const targetDate  = date ? new Date(date) : new Date();
  const numericBase = Number(basePrice);
  const reasons     = [];
  const breakdown   = [];

  const demandRate = getDemandMultiplier(occupancyRate);
  if (demandRate > 0) {
    const pct = Math.round(demandRate * 100);
    reasons.push(`High demand (+${pct}%)`);
    breakdown.push({ factor: 'demand', adjustmentPercent: pct, adjustmentReason: `High demand (+${pct}%)`, amount: Number((numericBase * demandRate).toFixed(2)) });
  }

  if (isWeekend(targetDate)) {
    reasons.push('Weekend (+10%)');
    breakdown.push({ factor: 'weekend', adjustmentPercent: 10, adjustmentReason: 'Weekend (+10%)', amount: Number((numericBase * 0.10).toFixed(2)) });
  }

  const holiday = checkHoliday(targetDate);
  if (holiday.isHoliday) {
    reasons.push(`${holiday.name} (+20%)`);
    breakdown.push({ factor: 'holiday', adjustmentPercent: 20, adjustmentReason: `${holiday.name} (+20%)`, amount: Number((numericBase * 0.20).toFixed(2)) });
  }

  if (isPeakSeason(targetDate)) {
    const month = targetDate.getMonth() + 1;
    const label = (month >= 6 && month <= 8) ? 'Summer season (+15%)' : 'Winter holidays (+15%)';
    reasons.push(label);
    breakdown.push({ factor: 'peakSeason', adjustmentPercent: 15, adjustmentReason: label, amount: Number((numericBase * 0.15).toFixed(2)) });
  }

  const totalRate  = breakdown.reduce((s, b) => s + b.adjustmentPercent, 0);
  const finalPrice = Number((numericBase * (1 + totalRate / 100)).toFixed(2));

  return { basePrice: numericBase, finalPrice, adjustmentPercent: totalRate, adjustmentReasons: reasons, breakdown };
}

// ---------------------------------------------------------------------------
// Price freeze helpers (in-memory fallback store)
// ---------------------------------------------------------------------------
export const fallbackFreezes = [];
let freezeIdCounter = 1;
const FREEZE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export function createFreezeFallback(userId, entityType, entityId, frozenPrice) {
  const expiresAt = new Date(Date.now() + FREEZE_DURATION_MS);
  const freeze = {
    id: freezeIdCounter++,
    userId: Number(userId),
    entityType,
    entityId: Number(entityId),
    frozenPrice: Number(frozenPrice),
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  };
  fallbackFreezes.push(freeze);
  return freeze;
}

export function getActiveFallbackFreeze(userId, entityType, entityId) {
  const now = new Date();
  return fallbackFreezes.find(
    f => f.userId === Number(userId) &&
         f.entityType === entityType &&
         f.entityId === Number(entityId) &&
         new Date(f.expiresAt) > now
  ) || null;
}

export { FREEZE_DURATION_MS };
