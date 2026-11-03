import test from 'node:test';
import assert from 'node:assert/strict';

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

// Helper evaluating permission limits
function evaluatePermissionAllowance(existingMinutes: number, requestedMinutes: number) {
  const MAX_MINUTES = 60;
  if (requestedMinutes <= 0 || requestedMinutes > MAX_MINUTES) {
    return { allowed: false, reason: 'Duration must be between 1 and 60 minutes.' };
  }
  if (existingMinutes + requestedMinutes > MAX_MINUTES) {
    return {
      allowed: false,
      reason: `Exceeds monthly limit. Remaining allowance: ${MAX_MINUTES - existingMinutes} minutes.`,
    };
  }
  return { allowed: true, remaining: MAX_MINUTES - (existingMinutes + requestedMinutes) };
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

test('Institutional permission rule enforces strict 60 minutes/month cap', () => {
  // First 45 mins: allowed
  const r1 = evaluatePermissionAllowance(0, 45);
  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 15);

  // Subsequent 30 mins: exceeds (45 + 30 = 75 > 60)
  const r2 = evaluatePermissionAllowance(45, 30);
  assert.equal(r2.allowed, false);

  // Subsequent 15 mins: exactly reaches 60 mins cap
  const r3 = evaluatePermissionAllowance(45, 15);
  assert.equal(r3.allowed, true);
  assert.equal(r3.remaining, 0);

  // Zero or negative minutes rejected
  assert.equal(evaluatePermissionAllowance(0, 0).allowed, false);
  assert.equal(evaluatePermissionAllowance(0, 70).allowed, false);
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
