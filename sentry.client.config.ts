import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    beforeSend(event) {
      // No PII from the browser
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.name;
      }
      return event;
    },
  });
}
