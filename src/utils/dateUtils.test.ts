import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWorkingDays,
  formatDate,
  formatDateRange,
  isDateInRange,
  doDateRangesOverlap,
  getTodayDateString,
} from './dateUtils';

test('calculateWorkingDays: calculates correct working days excluding Sundays', () => {
  // Monday to Friday: 5 days
  const fiveDays = calculateWorkingDays('2026-11-02', '2026-11-06');
  assert.equal(fiveDays, 5);

  // Friday to Monday: Friday(1), Saturday(1), Sunday(0), Monday(1) -> 3 days
  const threeDays = calculateWorkingDays('2026-11-06', '2026-11-09');
  assert.equal(threeDays, 3);

  // Single working day (Wednesday to Wednesday)
  const singleDay = calculateWorkingDays('2026-11-04', '2026-11-04');
  assert.equal(singleDay, 1);
});

test('calculateWorkingDays: handles edge cases (invalid dates, inverted range, empty)', () => {
  // End date earlier than start date returns 0
  assert.equal(calculateWorkingDays('2026-11-10', '2026-11-05'), 0);

  // Empty string inputs return 0
  assert.equal(calculateWorkingDays('', '2026-11-05'), 0);
  assert.equal(calculateWorkingDays('2026-11-05', ''), 0);

  // Malformed date returns 0
  assert.equal(calculateWorkingDays('not-a-date', '2026-11-05'), 0);
});

test('isDateInRange: accurately checks boundary and internal dates', () => {
  const start = '2026-11-05';
  const end = '2026-11-10';

  assert.equal(isDateInRange('2026-11-05', start, end), true);
  assert.equal(isDateInRange('2026-11-07', start, end), true);
  assert.equal(isDateInRange('2026-11-10', start, end), true);
  assert.equal(isDateInRange('2026-11-04', start, end), false);
  assert.equal(isDateInRange('2026-11-11', start, end), false);
});

test('doDateRangesOverlap: correctly evaluates intersecting date spans', () => {
  // Overlapping spans
  assert.equal(doDateRangesOverlap('2026-11-01', '2026-11-05', '2026-11-04', '2026-11-08'), true);

  // Non-overlapping spans
  assert.equal(doDateRangesOverlap('2026-11-01', '2026-11-03', '2026-11-05', '2026-11-08'), false);

  // Adjacent boundary touch
  assert.equal(doDateRangesOverlap('2026-11-01', '2026-11-05', '2026-11-05', '2026-11-08'), true);
});

test('formatDateRange: formats single dates and date spans gracefully', () => {
  const single = formatDateRange('2026-11-05', '2026-11-05');
  assert.match(single, /5.*Nov.*2026/);

  const range = formatDateRange('2026-11-05', '2026-11-10');
  assert.ok(range.includes('→'));
});

test('getTodayDateString: generates valid YYYY-MM-DD pattern', () => {
  const today = getTodayDateString(new Date(2026, 10, 2)); // Nov 2, 2026
  assert.equal(today, '2026-11-02');
});
