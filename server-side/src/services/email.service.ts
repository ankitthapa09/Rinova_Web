import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '@/config/env';
import { logger } from '@/config/logger';


/** True when every SMTP credential is present and none is a placeholder. */
function smtpConfigured(): boolean {
  const values = [env.SMTP_HOST, env.SMTP_USER, env.SMTP_PASS];
  return (
    values.every((v) => typeof v === 'string' && v.length > 0) &&
    env.SMTP_PORT !== undefined &&
    !values.some((v) => /^your[-_@]|example/i.test(v!))
  );
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      // Port 465 is implicit TLS; 587 upgrades via STARTTLS
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export const emailService = {
  async send(message: MailMessage): Promise<void> {
    if (!smtpConfigured()) {
      logger.info('email (console fallback — SMTP not configured)', {
        to: message.to,
        subject: message.subject,
      });
      console.log('\n────────────────────── EMAIL (dev) ──────────────────────');
      console.log(`To:      ${message.to}`);
      console.log(`Subject: ${message.subject}`);
      console.log(message.text);
      console.log('──────────────────────────────────────────────────────────\n');
      return;
    }

    await getTransporter().sendMail({ from: env.EMAIL_FROM, ...message });
    logger.info('email sent', { to: message.to, subject: message.subject });
  },

  /** The reset email — the only place the raw token appears outside the inbox. */
  passwordReset(to: string, name: string, resetUrl: string): Promise<void> {
    const firstName = name.split(' ')[0];
    return emailService.send({
      to,
      subject: 'Reset your Rinova password',
      text: [
        `Hi ${firstName},`,
        '',
        'Someone asked to reset the password for your Rinova account.',
        'If this was you, open the link below within 30 minutes:',
        '',
        resetUrl,
        '',
        "If you didn't ask for this, ignore this email — your password stays as it is.",
      ].join('\n'),
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#0B0B0D;color:#F4F1EA;border-radius:12px">
          <p style="font-size:22px;font-family:Georgia,serif;margin:0 0 20px">RINOVA</p>
          <p style="margin:0 0 12px">Hi ${firstName},</p>
          <p style="margin:0 0 20px;color:#8F8A7E">
            Someone asked to reset the password for your Rinova account.
            If this was you, the link below works for the next <strong style="color:#F4F1EA">30 minutes</strong>.
          </p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#FF5C1A;color:#0B0B0D;text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:999px;margin:0 0 20px">
            Reset password
          </a>
          <p style="margin:0;color:#8F8A7E;font-size:13px">
            If you didn't ask for this, ignore this email — your password stays as it is.
          </p>
        </div>`,
    });
  },

  /** The welcome/verification email sent on signup and on resend. */
  verifyEmail(to: string, name: string, verifyUrl: string): Promise<void> {
    const firstName = name.split(' ')[0];
    return emailService.send({
      to,
      subject: 'Verify your Rinova email',
      text: [
        `Hi ${firstName},`,
        '',
        'Welcome to Rinova. Confirm this email address by opening the link below',
        'within 24 hours:',
        '',
        verifyUrl,
        '',
        "If you didn't create a Rinova account, you can ignore this email.",
      ].join('\n'),
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#0B0B0D;color:#F4F1EA;border-radius:12px">
          <p style="font-size:22px;font-family:Georgia,serif;margin:0 0 20px">RINOVA</p>
          <p style="margin:0 0 12px">Hi ${firstName},</p>
          <p style="margin:0 0 20px;color:#8F8A7E">
            Welcome to Rinova. Confirm this email address — the link works for the next
            <strong style="color:#F4F1EA">24 hours</strong>.
          </p>
          <a href="${verifyUrl}"
             style="display:inline-block;background:#FF5C1A;color:#0B0B0D;text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:999px;margin:0 0 20px">
            Verify email
          </a>
          <p style="margin:0;color:#8F8A7E;font-size:13px">
            If you didn't create a Rinova account, you can ignore this email.
          </p>
        </div>`,
    });
  },
};
