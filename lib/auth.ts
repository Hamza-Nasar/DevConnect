// lib/auth.ts
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { AuthOptions } from "next-auth";

export const authOptions: AuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        // ✅ fix OAuthAccountNotLinked issue
        async signIn({ user, account, profile }) {
            if (!user.email) return false;

            const existingUser = await prisma.user.findUnique({
                where: { email: user.email },
            });

            // If user exists but not linked to this provider, link it automatically
            if (existingUser) {
                const linkedAccount = await prisma.account.findFirst({
                    where: {
                        provider: account?.provider,
                        providerAccountId: account?.providerAccountId,
                        userId: existingUser.id,
                    },
                });

                if (!linkedAccount && account) {
                    await prisma.account.create({
                        data: {
                            userId: existingUser.id,
                            type: account.type,
                            provider: account.provider,
                            providerAccountId: account.providerAccountId,
                            access_token: account.access_token,
                            expires_at: account.expires_at,
                            token_type: account.token_type,
                            scope: account.scope,
                            id_token: account.id_token,
                        },
                    });
                }
            }

            return true;
        },

        async redirect({ url, baseUrl }) {
            if (url.startsWith(baseUrl)) return url;
            return `${baseUrl}/feed`;
        },

        async session({ session, user }) {
            return { ...session, user: { ...session.user, id: user.id } };
        },
    },

    pages: {
        signIn: "/login",
    },

    secret: process.env.NEXTAUTH_SECRET,
    debug: true,
};
