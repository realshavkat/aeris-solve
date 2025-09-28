// Fichier: app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const authOptions: AuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.id) return false;

      try {
        const { db } = await connectToDatabase();
        const existingUser = await db.collection("users").findOne({ discordId: profile.id });

        // Vérifier si l'utilisateur est banni
        if (existingUser?.status === 'banned') {
          return '/banned';
        }

        // Si l'utilisateur n'existe pas, le créer
        if (!existingUser) {
          await db.collection("users").insertOne({
            discordId: profile.id,
            discordUsername: profile.username,
            discordDiscriminator: profile.discriminator || '0',
            avatar: profile.avatar,
            nickname: profile.username,
            status: 'needs_registration',
            role: 'visitor',
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        return true;
      } catch (error) {
        console.error("Error during sign-in:", error);
        return false;
      }
    },

    async jwt({ token, account, profile, trigger }) {
      if (account && profile) {
        try {
          const { db } = await connectToDatabase();
          const user = await db.collection("users").findOne({ discordId: profile.id });
          if (user) {
            token.id = user._id.toString();
            token.role = user.role || 'visitor';
            token.status = user.status || 'needs_registration';
            token.discordId = user.discordId;
            token.name = user.anonymousNickname || user.discordUsername;
            token.rpName = user.rpName;
            token.anonymousNickname = user.anonymousNickname;
          }
        } catch (error) {
          console.error("JWT Error:", error);
        }
      }
      
      // Rafraîchir les données utilisateur quand update() est appelé
      if (trigger === "update" && token.id) {
        try {
          const { db } = await connectToDatabase();
          const user = await db.collection("users").findOne({ 
            _id: new ObjectId(token.id as string) 
          });
          if (user) {
            token.role = user.role || 'visitor';
            token.status = user.status || 'needs_registration';
            token.name = user.anonymousNickname || user.discordUsername;
            token.rpName = user.rpName;
            token.anonymousNickname = user.anonymousNickname;
          }
        } catch (error) {
          console.error("JWT Update Error:", error);
        }
      }
      
      return token;
    },

    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.status = token.status as string;
        session.user.discordId = token.discordId as string;
        session.user.name = token.name as string;
        session.user.rpName = token.rpName as string;
        session.user.anonymousNickname = token.anonymousNickname as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };