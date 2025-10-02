export const runtime = "nodejs";

import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";


console.info("[AUTH VARS]", {
  idPreview: process.env.DISCORD_CLIENT_ID?.slice(0,4) + "..." + process.env.DISCORD_CLIENT_ID?.slice(-4),
  secretLen: process.env.DISCORD_CLIENT_SECRET?.length || 0,
  naUrl: process.env.NEXTAUTH_URL,
});

if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
  console.error("[AUTH] Missing Discord env vars");
  throw new Error("Missing Discord OAuth env vars");
}


const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: "identify email" } },
    }),
  ],
});
export { handler as GET, handler as POST };
