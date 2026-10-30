const dayPattern = /(?:第\s*(\d+)\s*天|\bday[\s_-]*(\d+)\b)/i;

export function detectDayNumber(content: string, fileName: string): number | null {
  const candidates = [fileName.replace(/\.[^.]+$/, ""), ...content.split(/\r?\n/).slice(0, 12)];
  for (const candidate of candidates) {
    const match = candidate.match(dayPattern);
    if (!match) continue;
    const dayNumber = Number(match[1] ?? match[2]);
    if (Number.isSafeInteger(dayNumber) && dayNumber > 0) return dayNumber;
  }
  return null;
}

export function nextDayNumber(days: number[]) {
  return Math.max(0, ...days) + 1;
}
