export const runtime = "nodejs";

import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET, // ou AUTH_SECRET si v5
  session: { strategy: "jwt" },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      // authorization: { params: { scope: "identify email" } }, // optionnel
    }),
  ],
  // 🔧 anti-boucle de callbackUrl
  callbacks: {
    async redirect({ url, baseUrl }) {
      try {
        const u = new URL(url, baseUrl);
        if (u.origin === baseUrl) {
          u.searchParams.delete("callbackUrl");
          u.searchParams.delete("error");
          return u.toString();
        }
      } catch {}
      return baseUrl;
    },
  },
});

export { handler as GET, handler as POST };
