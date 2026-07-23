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

// Midnight-garage palette, mirrored from the site so the inbox feels like Rinova.
const C = {
  night: '#0B0B0D',
  surface: '#15141A',
  cream: '#F4F1EA',
  fog: '#8F8A7E',
  line: '#26242B',
  accent: '#FF5C1A',
};

interface ThemedEmail {
  preheader: string; // hidden inbox-preview line
  heading: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  expiryNote: string;
  footer: string;
}

/**
 * One themed shell for every transactional email — table-based and
 * inline-styled so it survives Gmail/Outlook, which strip <style> and flexbox.
 */
function renderEmail(e: ThemedEmail): string {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:${C.night};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0">${e.preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.night};padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:${C.surface};border:1px solid ${C.line};border-radius:16px;overflow:hidden">
        <tr><td style="padding:36px 36px 8px">
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:2px;color:${C.cream}">
            RINOVA<span style="color:${C.accent}">.</span>
          </p>
        </td></tr>
        <tr><td style="padding:20px 36px 0">
          <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;color:${C.cream};font-weight:normal">${e.heading}</h1>
          <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${C.fog}">${e.intro}</p>
        </td></tr>
        <tr><td style="padding:28px 36px 0">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:${C.accent}">
            <a href="${e.ctaUrl}" style="display:inline-block;padding:13px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:${C.night};text-decoration:none;border-radius:999px">${e.ctaLabel}</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:24px 36px 0">
          <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${C.fog}">Button not working? Paste this link into your browser:</p>
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;word-break:break-all"><a href="${e.ctaUrl}" style="color:${C.accent};text-decoration:none">${e.ctaUrl}</a></p>
          <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${C.fog}">${e.expiryNote}</p>
        </td></tr>
        <tr><td style="padding:28px 36px 36px">
          <div style="border-top:1px solid ${C.line};padding-top:16px">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${C.fog}">${e.footer}</p>
          </div>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${C.line}">Rinova — vehicle rentals &amp; detailing</p>
    </td></tr>
  </table>
</body>
</html>`;
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
      html: renderEmail({
        preheader: 'Reset your Rinova password — link expires in 30 minutes.',
        heading: `Hi ${firstName}, let's reset your password.`,
        intro:
          'Someone asked to reset the password for your Rinova account. If this was you, use the button below to choose a new one.',
        ctaLabel: 'Reset password',
        ctaUrl: resetUrl,
        expiryNote: 'This link works for the next 30 minutes, then it expires.',
        footer:
          "If you didn't ask for this, ignore this email — your password stays exactly as it is.",
      }),
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
      html: renderEmail({
        preheader: 'Confirm your email to finish setting up your Rinova account.',
        heading: `Welcome to Rinova, ${firstName}.`,
        intro:
          'One quick step to finish setting up your account — confirm this email address so we know it really reaches you.',
        ctaLabel: 'Verify email',
        ctaUrl: verifyUrl,
        expiryNote: 'This link works for the next 24 hours, then it expires.',
        footer: "If you didn't create a Rinova account, you can safely ignore this email.",
      }),
    });
  },
};
