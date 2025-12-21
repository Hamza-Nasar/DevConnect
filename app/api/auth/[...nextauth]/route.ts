import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Next.js 16 compatible handler
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
