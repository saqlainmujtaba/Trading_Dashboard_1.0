import assert from 'node:assert/strict';
import test from 'node:test';
import { loginUser, registerUser } from '../src/controllers/authController.js';

const invoke = async (handler, body) => {
  const response = {
    statusCode: 200,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  await handler({ body }, response);
  return response;
};

test('registration requires email delivery and blocks unverified login', async () => {
  const email = `signup-${Date.now()}@example.test`;
  const password = 'secure-password';
  const smtpKeys = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const previousValues = Object.fromEntries(smtpKeys.map((key) => [key, process.env[key]]));
  smtpKeys.forEach((key) => { delete process.env[key]; });

  try {
    const registration = await invoke(registerUser, {
      name: 'Registration Tester',
      email,
      password,
    });

    assert.equal(registration.statusCode, 503);
    assert.equal(registration.body.requiresEmailVerification, true);
    assert.equal(registration.body.token, undefined);

    const login = await invoke(loginUser, { email, password });
    assert.equal(login.statusCode, 403);
    assert.equal(login.body.code, 'EMAIL_NOT_VERIFIED');
  } finally {
    smtpKeys.forEach((key) => {
      if (previousValues[key] === undefined) delete process.env[key];
      else process.env[key] = previousValues[key];
    });
  }
});
