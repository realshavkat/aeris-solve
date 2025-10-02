export const runtime = "nodejs"; // important: pas d'edge pour Discord/Mongo

import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET, // si tu es en v5, mets AUTH_SECRET
  session: { strategy: "jwt" },
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,         // en v5: AUTH_DISCORD_ID
      clientSecret: process.env.DISCORD_CLIENT_SECRET!, // en v5: AUTH_DISCORD_SECRET
      // on demande l'email, sinon Discord peut ne pas le renvoyer
      authorization: { params: { scope: "identify email" } },
      // on tolère l’absence d’email (sinon certains templates crashtent)
      profile(p) {
        return {
          id: p.id,
          name: p.global_name ?? p.username ?? `user-${p.id}`,
          email: p.email ?? null,
          image: p.avatar
            ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png`
            : null,
        };
      },
    }),
  ],
  // coupe l'empilement de callbackUrl & les boucles de redirection
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
