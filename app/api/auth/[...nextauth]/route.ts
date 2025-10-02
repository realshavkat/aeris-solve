export const runtime = "nodejs";
import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID || process.env.AUTH_DISCORD_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET || process.env.AUTH_DISCORD_SECRET!,
      authorization: { params: { scope: "identify email" } },
    }),
  ],
});
export { handler as GET, handler as POST };
