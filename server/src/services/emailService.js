import { createInterface } from 'node:readline';
import net from 'node:net';
import tls from 'node:tls';

export class EmailConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EmailConfigurationError';
  }
}

class SmtpClient {
  constructor(socket) {
    this.socket = socket;
    this.attachReader();
  }

  attachReader() {
    this.reader = createInterface({ input: this.socket, crlfDelay: Infinity })[Symbol.asyncIterator]();
  }

  async readResponse() {
    const lines = [];
    let responseCode;
    while (true) {
      const { value, done } = await this.reader.next();
      if (done || !value) throw new Error('SMTP server closed the connection unexpectedly.');
      lines.push(value);
      const match = value.match(/^(\d{3})([- ])/);
      if (!match) throw new Error('SMTP server returned an invalid response.');
      responseCode ||= match[1];
      if (match[1] !== responseCode) throw new Error('SMTP server returned an invalid multi-line response.');
      if (match[2] === ' ') return { code: Number(responseCode), lines };
    }
  }

  async expectResponse(expectedCodes) {
    const response = await this.readResponse();
    if (!expectedCodes.includes(response.code)) {
      throw new Error(`SMTP command failed (${response.code}): ${response.lines.join(' ')}`);
    }
    return response;
  }

  async command(command, expectedCodes) {
    if (/[\r\n]/.test(command)) throw new Error('Invalid SMTP command.');
    this.socket.write(`${command}\r\n`);
    return this.expectResponse(expectedCodes);
  }

  async upgradeToTls(hostname) {
    const rawSocket = this.socket;
    await this.reader.return?.();
    const secureSocket = tls.connect({ socket: rawSocket, servername: hostname });
    await new Promise((resolve, reject) => {
      secureSocket.once('secureConnect', resolve);
      secureSocket.once('error', reject);
    });
    this.socket = secureSocket;
    this.attachReader();
  }

  close() {
    this.reader.return?.();
    this.socket.end();
  }
}

const connectSmtp = async (host, port, secure) => {
  const socket = secure
    ? tls.connect({ host, port, servername: host })
    : net.createConnection({ host, port });
  socket.setTimeout(15_000, () => socket.destroy(new Error('SMTP connection timed out.')));
  await new Promise((resolve, reject) => {
    socket.once(secure ? 'secureConnect' : 'connect', resolve);
    socket.once('error', reject);
  });
  return new SmtpClient(socket);
};

const validateAddress = (address) => {
  if (!address || /[\r\n]/.test(address)) throw new EmailConfigurationError('SMTP_FROM must be a valid email address.');
  const match = address.match(/<([^<>]+)>$/);
  const mailbox = (match ? match[1] : address).trim();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(mailbox)) {
    throw new EmailConfigurationError('SMTP_FROM must contain a valid email address.');
  }
  return mailbox;
};

const dotStuff = (content) => content.replace(/(^|\r\n)\./g, '$1..');

export const sendOtpEmail = async ({ email, otp, purpose }) => {
  const {
    SMTP_HOST,
    SMTP_PORT = '587',
    SMTP_SECURE,
    SMTP_STARTTLS,
    SMTP_USER,
    SMTP_PASSWORD,
  } = process.env;
  const from = process.env.SMTP_FROM || SMTP_USER;
  const port = Number(SMTP_PORT);
  if (!SMTP_HOST || !from || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new EmailConfigurationError('Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, and SMTP_FROM (or SMTP_USER).');
  }
  if (Boolean(SMTP_USER) !== Boolean(SMTP_PASSWORD)) {
    throw new EmailConfigurationError('SMTP_USER and SMTP_PASSWORD must both be set when SMTP authentication is used.');
  }

  const fromMailbox = validateAddress(from);
  const toMailbox = validateAddress(email);
  const isVerification = purpose === 'verify-email';
  const action = isVerification ? 'verify your email address' : 'reset your password';
  const subject = isVerification ? 'Verify your email address' : 'Reset your password';
  const boundary = `otp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const message = [
    `From: ${from}`,
    `To: ${toMailbox}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    `Use this one-time code to ${action}: ${otp}`,
    '',
    'This code expires in 10 minutes. If you did not request it, you can ignore this email.',
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    `<p>Use this one-time code to ${action}:</p><p style="font-size:28px;font-weight:bold;letter-spacing:8px">${otp}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>`,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  const secure = SMTP_SECURE
    ? SMTP_SECURE.toLowerCase() === 'true'
    : port === 465;
  const useStartTls = !secure && SMTP_STARTTLS?.toLowerCase() !== 'false';
  const client = await connectSmtp(SMTP_HOST, port, secure);
  try {
    await client.expectResponse([220]);
    const hello = await client.command('EHLO trading-dashboard.local', [250]);
    const supportsStartTls = hello.lines.some((line) => /^250[- ]STARTTLS\b/i.test(line));

    if (useStartTls) {
      if (!supportsStartTls) throw new Error('SMTP server does not support the required STARTTLS encryption.');
      await client.command('STARTTLS', [220]);
      await client.upgradeToTls(SMTP_HOST);
      await client.command('EHLO trading-dashboard.local', [250]);
    }

    if (SMTP_USER) {
      if (!secure && !useStartTls) {
        throw new EmailConfigurationError('SMTP authentication requires TLS. Enable STARTTLS or use implicit TLS.');
      }
      await client.command('AUTH LOGIN', [334]);
      await client.command(Buffer.from(SMTP_USER).toString('base64'), [334]);
      await client.command(Buffer.from(SMTP_PASSWORD).toString('base64'), [235]);
    }

    await client.command(`MAIL FROM:<${fromMailbox}>`, [250]);
    await client.command(`RCPT TO:<${toMailbox}>`, [250, 251]);
    await client.command('DATA', [354]);
    client.socket.write(`${dotStuff(message)}\r\n.\r\n`);
    await client.expectResponse([250]);
    client.socket.write('QUIT\r\n');
  } finally {
    client.close();
  }
};
