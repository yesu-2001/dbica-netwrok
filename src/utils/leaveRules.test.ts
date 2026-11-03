import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeToMinutes } from './dateUtils';

// Helper evaluating password strength
function evaluatePassword(password: string) {
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumberOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);

  let score = 0;
  if (hasMinLength) score++;
  if (hasUpper) score++;
  if (hasLower) score++;
  if (hasNumberOrSpecial) score++;

  return { isValid: hasMinLength && score >= 2, score, hasMinLength };
}

// Permission requests have no monthly cap; each request needs a positive duration.
function evaluatePermissionRequest(requestedMinutes: number) {
  return { allowed: Number.isFinite(requestedMinutes) && requestedMinutes > 0 };
}

// Helper evaluating balance deduction & refund
function applyBalanceTransaction(
  currentBalance: number,
  days: number,
  transactionType: 'deduct' | 'refund'
) {
  if (transactionType === 'deduct') {
    if (days > currentBalance) {
      return { success: false, newBalance: currentBalance, error: 'Insufficient balance' };
    }
    return { success: true, newBalance: currentBalance - days };
  } else {
    return { success: true, newBalance: currentBalance + days };
  }
}

test('Password strength evaluator enforces security requirements', () => {
  assert.equal(evaluatePassword('12345').isValid, false);
  assert.equal(evaluatePassword('short').isValid, false);
  assert.equal(evaluatePassword('password').isValid, true);
  assert.equal(evaluatePassword('Dbica@2026').score, 4);
  assert.equal(evaluatePassword('Dbica@2026').isValid, true);
});

test('Permission requests have no monthly cap but require a positive duration', () => {
  assert.equal(evaluatePermissionRequest(45).allowed, true);
  assert.equal(evaluatePermissionRequest(90).allowed, true);
  assert.equal(evaluatePermissionRequest(180).allowed, true);
  assert.equal(evaluatePermissionRequest(0).allowed, false);
  assert.equal(evaluatePermissionRequest(-15).allowed, false);
  assert.equal(evaluatePermissionRequest(Number.NaN).allowed, false);
});

test('Permission duration is calculated from a valid time window', () => {
  const start = parseTimeToMinutes('09:30');
  const end = parseTimeToMinutes('11:00');
  const duration = start !== null && end !== null ? end - start : null;
  assert.equal(duration, 90);
  assert.equal(parseTimeToMinutes('13:70'), null);
});

test('Leave balance transactions handle deductions, limits, and refunds safely', () => {
  const current = 12;

  // Normal deduction
  const res1 = applyBalanceTransaction(current, 3, 'deduct');
  assert.equal(res1.success, true);
  assert.equal(res1.newBalance, 9);

  // Insufficient balance deduction attempt
  const res2 = applyBalanceTransaction(current, 15, 'deduct');
  assert.equal(res2.success, false);
  assert.equal(res2.newBalance, 12);

  // Status transition to cancelled/rejected (balance refund)
  const res3 = applyBalanceTransaction(9, 3, 'refund');
  assert.equal(res3.success, true);
  assert.equal(res3.newBalance, 12);
});
