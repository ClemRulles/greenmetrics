import nodemailer from 'nodemailer';

export function getTransport() {
  // In dev, if EMAIL_SERVER is not set, use a stub transport that logs
  if (!process.env.EMAIL_SERVER) {
    return {
      sendMail: async (opts: { to: string; from: string; subject: string; text: string }) => {
        // eslint-disable-next-line no-console
        console.log('[MAIL:DEV]', { to: opts.to, subject: opts.subject, text: opts.text });
        return { messageId: 'dev' };
      }
    };
  }
  return nodemailer.createTransport(process.env.EMAIL_SERVER);
}
