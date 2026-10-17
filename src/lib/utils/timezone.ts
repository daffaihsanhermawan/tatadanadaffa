// ==============================================================================
// WIB (Asia/Jakarta, UTC+7) Timezone & Indonesian Locale Helpers
// ==============================================================================

const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Returns current Date adjusted to Asia/Jakarta (UTC+7)
 */
export function getWIBDate(dateInput: Date | string | number = new Date()): Date {
  const d = new Date(dateInput);
  // Get UTC time and add 7 hours
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 7));
}

/**
 * Format date into Indonesian Telegram & Dashboard standard:
 * e.g. "Kamis, 16 Oktober 2026 — 22:30 WIB"
 */
export function formatWIBDateTime(dateInput: Date | string | number = new Date()): string {
  const d = getWIBDate(dateInput);
  const dayName = DAYS_ID[d.getDay()];
  const dateNum = d.getDate();
  const monthName = MONTHS_ID[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${dayName}, ${dateNum} ${monthName} ${year} — ${hours}:${minutes} WIB`;
}

/**
 * Format date into Indonesian Short Date: "16 Okt 2026"
 */
export function formatWIBDateShort(dateInput: Date | string | number = new Date()): string {
  const d = getWIBDate(dateInput);
  const dateNum = d.getDate();
  const monthShort = MONTHS_ID[d.getMonth()].slice(0, 3);
  const year = d.getFullYear();
  return `${dateNum} ${monthShort} ${year}`;
}

/**
 * Format currency to Rupiah: "Rp15.000" or "Rp1.500.000"
 */
export function formatRupiah(amount: number): string {
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp${formatted}`;
}

/**
 * Get current month key in WIB: "2026-10"
 */
export function getCurrentMonthKeyWIB(): string {
  const d = getWIBDate();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Converts a date input to Asia/Jakarta WIB "YYYY-MM-DD" string
 */
export function toWIBDateString(dateInput: Date | string | number = new Date()): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch {
    const wib = getWIBDate(dateInput);
    const y = wib.getFullYear();
    const m = String(wib.getMonth() + 1).padStart(2, '0');
    const day = String(wib.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

/**
 * Extract natural language Indonesian date from transaction prompt
 * e.g. "Beli iPhone 20jt tanggal 14 oktober" -> "2026-10-14"
 * e.g. "Gajian 10jt tgl 1 okt bca" -> "2026-10-01"
 * e.g. "beli bakso 15rb kemarin" -> yesterday YYYY-MM-DD
 * e.g. "makan padang 25rb 14/10/2026" -> "2026-10-14"
 * e.g. "beli pulsa 50k tanggal 14" -> "2026-10-14"
 */
export function extractDateFromText(text: string, referenceDate: Date = new Date()): string | undefined {
  const clean = text.toLowerCase().trim();
  const ref = getWIBDate(referenceDate);
  const curYear = ref.getFullYear();
  const curMonth = ref.getMonth() + 1;

  const MONTH_MAP: Record<string, number> = {
    'januari': 1, 'jan': 1,
    'februari': 2, 'feb': 2,
    'maret': 3, 'mar': 3,
    'april': 4, 'apr': 4,
    'mei': 5,
    'juni': 6, 'jun': 6,
    'juli': 7, 'jul': 7,
    'agustus': 8, 'agu': 8, 'ags': 8,
    'september': 9, 'sep': 9, 'sept': 9,
    'oktober': 10, 'okt': 10,
    'november': 11, 'nov': 11,
    'desember': 12, 'des': 12
  };

  // 1. Relative dates: "hari ini", "kemarin lusa", "kemarin", "lusa", "(\d+) hari lalu"
  if (/\b(?:kemarin\s+lusa)\b/i.test(clean)) {
    const d = new Date(ref);
    d.setDate(d.getDate() - 2);
    return toWIBDateString(d);
  }
  if (/\b(?:kemarin)\b/i.test(clean)) {
    const d = new Date(ref);
    d.setDate(d.getDate() - 1);
    return toWIBDateString(d);
  }
  if (/\b(?:lusa)\b/i.test(clean)) {
    const d = new Date(ref);
    d.setDate(d.getDate() + 2);
    return toWIBDateString(d);
  }
  const daysAgoMatch = clean.match(/(\d+)\s*hari\s*(?:yang\s*)?lalu/i);
  if (daysAgoMatch) {
    const daysAgo = parseInt(daysAgoMatch[1], 10);
    const d = new Date(ref);
    d.setDate(d.getDate() - daysAgo);
    return toWIBDateString(d);
  }
  if (/\bhari\s*ini\b/i.test(clean)) {
    return toWIBDateString(ref);
  }

  // 2. Explicit date with Indonesian month: "tanggal 14 oktober", "tgl 14 okt", "14 oktober 2026", "14 okt"
  const monthNamesPattern = 'januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|mei|jun|jul|agu|ags|sep|sept|okt|nov|des';
  const monthRegex = new RegExp(`(?:(?:tanggal|tgl)\\s+)?(\\d{1,2})\\s+(${monthNamesPattern})(?:\\s+(\\d{4}))?`, 'i');
  const monthMatch = clean.match(monthRegex);
  if (monthMatch) {
    const day = parseInt(monthMatch[1], 10);
    const month = MONTH_MAP[monthMatch[2].toLowerCase()];
    const year = monthMatch[3] ? parseInt(monthMatch[3], 10) : curYear;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 3. Slash / Dash dates: "14/10/2026", "14-10-2026", "14/10", "tanggal 14/10"
  const slashRegex = /(?:(?:tanggal|tgl)\s+)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/i;
  const slashMatch = clean.match(slashRegex);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    let year = curYear;
    if (slashMatch[3]) {
      year = slashMatch[3].length === 2 ? 2000 + parseInt(slashMatch[3], 10) : parseInt(slashMatch[3], 10);
    }
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 4. Plain "tanggal 14" or "tgl 14" without month name (defaults to current month)
  const plainDayMatch = clean.match(/(?:tanggal|tgl)\s+(\d{1,2})(?!\s*(?:rb|ribu|k|jt|juta|\d))/i);
  if (plainDayMatch) {
    const day = parseInt(plainDayMatch[1], 10);
    if (day >= 1 && day <= 31) {
      return `${curYear}-${String(curMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return undefined;
}


