import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE || 0),
    beforeSend(event) {
      // Ensure no PII is accidentally captured
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.name;
      }
      return event;
    },
  });
}
