import nodemailer from 'nodemailer';

let transporter;

export const isEmailConfigured = () => Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
);

export const sendAuthCodeEmail = async ({ to, name, code, purpose }) => {
  if (!isEmailConfigured()) {
    const error = new Error('Email delivery is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.');
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }

  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }

  const isVerification = purpose === 'email verification';
  const appName = process.env.APP_NAME || 'Personal Trading Dashboard';
  const subject = isVerification ? `Verify your ${appName} email` : `Reset your ${appName} password`;
  const greeting = String(name || 'Trader').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: `${appName} <${from}>`,
    to,
    subject,
    text: `Hi ${name || 'Trader'},\n\nYour ${purpose} code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `<p>Hi ${greeting},</p><p>Your ${purpose} code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
  });
};
