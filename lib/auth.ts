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
        async redirect({ baseUrl }) {
            return `${baseUrl}/feed`; // redirect after login
        },
        async session({ session, user }) {
            return { ...session, user: { ...session.user, id: user.id } };
        },
    },
    pages: { signIn: "/login" },
    debug: true,
    secret: process.env.NEXTAUTH_SECRET,
};
