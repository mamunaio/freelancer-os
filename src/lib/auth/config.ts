import "server-only";

import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { mongoClientPromise, connectMongoose } from "@/lib/db/client";
import { User } from "@/lib/db/models";
import { serverEnv } from "@/lib/env";

/**
 * Auth.js v5 configuration.
 *
 * Strategy: JWT sessions (works on the edge), MongoDB adapter for persistent
 * accounts/users/sessions tables. Two providers:
 *   - Credentials (email + password) for the bootstrap owner and seat invites.
 *   - Google OAuth (only enabled when AUTH_GOOGLE_ID is configured).
 */

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      locale: "en" | "bn";
      themeMode: "dark" | "light";
      activeOrgId: string | null;
    } & DefaultSession["user"];
  }
}

const googleProvider = serverEnv.googleClientId && serverEnv.googleClientSecret
  ? [
      Google({
        clientId: serverEnv.googleClientId,
        clientSecret: serverEnv.googleClientSecret,
        // We treat Google emails as verified.
        allowDangerousEmailAccountLinking: false,
      }),
    ]
  : [];

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(mongoClientPromise, {
    databaseName: serverEnv.mongoDb,
  }),
  session: { strategy: "jwt" },
  secret: serverEnv.authSecret,
  trustHost: true,
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    ...googleProvider,
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        await connectMongoose();
        const user = await User.findOne({ email: parsed.data.email })
          .select("+passwordHash")
          .lean();

        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // First sign-in: stamp the user's id and load their preferences.
      if (user) {
        token.userId = user.id;
        await connectMongoose();
        const dbUser = await User.findById(user.id)
          .select("locale themeMode activeOrgId")
          .lean();
        if (dbUser) {
          token.locale = dbUser.locale ?? "en";
          token.themeMode = dbUser.themeMode ?? "dark";
          token.activeOrgId = dbUser.activeOrgId?.toString() ?? null;
        }
      }

      // Allow `update()` calls from the client to refresh selected fields.
      if (trigger === "update" && session) {
        if (session.locale) token.locale = session.locale;
        if (session.themeMode) token.themeMode = session.themeMode;
        if (session.activeOrgId !== undefined) {
          token.activeOrgId = session.activeOrgId;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.userId && session.user) {
        session.user.id = token.userId as string;
        session.user.locale = (token.locale as "en" | "bn") ?? "en";
        session.user.themeMode = (token.themeMode as "dark" | "light") ?? "dark";
        session.user.activeOrgId =
          (token.activeOrgId as string | null | undefined) ?? null;
      }
      return session;
    },
  },
});
