import { PrismaAdapter } from '@next-auth/prisma-adapter';
import EmailProvider from 'next-auth/providers/email';
import type { NextAuthOptions } from 'next-auth';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // Use JWT so middleware can authorize without DB calls
  session: { strategy: 'jwt' },
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER || 'smtp://localhost:1025',
      from: process.env.EMAIL_FROM || 'noreply@greenmetrics.dev',
      // We can add sendVerificationRequest later for branded emails.
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Persist user id to the token
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  // Default pages (NextAuth will render its basic UI if hit directly).
  // We'll redirect users to our localized sign-in via middleware.
  debug: process.env.NODE_ENV === 'development',
};
