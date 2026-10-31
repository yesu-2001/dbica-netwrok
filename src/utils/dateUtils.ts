/**
 * Date and working day calculation utilities for DBICA Leave Management
 */

export function calculateWorkingDays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (end < start) return 0;

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    // 0 = Sunday (Weekly institution holiday)
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  // Minimum 1 day if start and end are on Sunday or same day fallback
  return Math.max(1, count);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return dateStr;
  
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(isoStr: string): string {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return isoStr;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return '';
  if (startDate === endDate) return formatDate(startDate);
  return `${formatDate(startDate)} → ${formatDate(endDate)}`;
}

export function isDateInRange(targetDateStr: string, startDateStr: string, endDateStr: string): boolean {
  const target = new Date(targetDateStr + 'T00:00:00').getTime();
  const start = new Date(startDateStr + 'T00:00:00').getTime();
  const end = new Date(endDateStr + 'T00:00:00').getTime();
  return target >= start && target <= end;
}

export function doDateRangesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = new Date(start1 + 'T00:00:00').getTime();
  const e1 = new Date(end1 + 'T00:00:00').getTime();
  const s2 = new Date(start2 + 'T00:00:00').getTime();
  const e2 = new Date(end2 + 'T00:00:00').getTime();

  return Math.max(s1, s2) <= Math.min(e1, e2);
}
