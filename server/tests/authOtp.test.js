import assert from 'node:assert/strict';
import net from 'node:net';
import test from 'node:test';
import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from '../src/controllers/authController.js';

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

test('email verification and password reset use expiring email OTPs', async (t) => {
  const emails = [];
  const server = net.createServer((socket) => {
    socket.setEncoding('utf8');
    socket.write('220 local test SMTP\r\n');
    let buffer = '';
    let readingMessage = false;
    let messageLines = [];

    socket.on('data', (chunk) => {
      buffer += chunk;
      while (buffer.includes('\r\n')) {
        const boundary = buffer.indexOf('\r\n');
        const line = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        if (readingMessage) {
          if (line === '.') {
            readingMessage = false;
            emails.push(messageLines.join('\r\n'));
            messageLines = [];
            socket.write('250 message accepted\r\n');
          } else {
            messageLines.push(line);
          }
        } else if (line.startsWith('EHLO ')) {
          socket.write('250-local test server\r\n250 OK\r\n');
        } else if (line === 'DATA') {
          readingMessage = true;
          socket.write('354 send message\r\n');
        } else if (line === 'QUIT') {
          socket.end('221 closing connection\r\n');
        } else {
          socket.write('250 OK\r\n');
        }
      }
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const envKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_STARTTLS', 'SMTP_FROM', 'SMTP_USER', 'SMTP_PASSWORD'];
  const oldEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: String(server.address().port),
    SMTP_SECURE: 'false',
    SMTP_STARTTLS: 'false',
    SMTP_FROM: 'Trading Dashboard <no-reply@example.test>',
  });
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASSWORD;
  t.after(() => {
    for (const key of envKeys) {
      if (oldEnv[key] === undefined) delete process.env[key];
      else process.env[key] = oldEnv[key];
    }
  });

  const email = `otp-${Date.now()}@example.test`;
  const oldPassword = 'original-password';
  const registration = await invoke(registerUser, { name: 'OTP Tester', email, password: oldPassword });
  assert.equal(registration.statusCode, 200);
  assert.match(registration.body.message, /verification code/i);
  assert.doesNotMatch(emails[0], new RegExp(oldPassword));
  const verificationCode = emails[0].match(/one-time code to verify your email address: (\d{6})/)?.[1];
  assert.ok(verificationCode);

  const wrongCode = verificationCode === '000000' ? '000001' : '000000';
  const rejectedVerification = await invoke(verifyEmail, { email, otp: wrongCode });
  assert.equal(rejectedVerification.statusCode, 400);

  const verified = await invoke(verifyEmail, { email, otp: verificationCode });
  assert.equal(verified.statusCode, 201);
  assert.equal(verified.body.email, email);
  assert.ok(verified.body.token);

  const resetRequest = await invoke(requestPasswordReset, { email });
  assert.equal(resetRequest.statusCode, 200);
  const resetCode = emails[1].match(/one-time code to reset your password: (\d{6})/)?.[1];
  assert.ok(resetCode);

  const newPassword = 'updated-password';
  const reset = await invoke(resetPassword, { email, otp: resetCode, password: newPassword });
  assert.equal(reset.statusCode, 200);
  const login = await invoke(loginUser, { email, password: newPassword });
  assert.equal(login.statusCode, 200);
  assert.equal(login.body.email, email);
});
