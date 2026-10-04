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

test('registration creates an account and returns a session without email verification', async () => {
  const email = `signup-${Date.now()}@example.test`;
  const password = 'secure-password';

  const registration = await invoke(registerUser, {
    name: 'Registration Tester',
    email,
    password,
  });

  assert.equal(registration.statusCode, 201);
  assert.equal(registration.body.email, email);
  assert.ok(registration.body.token);

  const login = await invoke(loginUser, { email, password });
  assert.equal(login.statusCode, 200);
  assert.equal(login.body.email, email);
  assert.ok(login.body.token);
});
