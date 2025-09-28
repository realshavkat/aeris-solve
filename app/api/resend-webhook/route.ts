// Fichier: app/api/resend-webhook/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import User from "@/models/user";
import axios from "axios";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
    }

    await connectToDatabase();
    
    const user = await User.findById(session.user.id);
    
    if (!user) {
      return NextResponse.json({ message: "Utilisateur non trouvé" }, { status: 404 });
    }

    const oneHourAgo = new Date(Date.now() - 3600000);
    if (new Date(user.createdAt) > oneHourAgo) {
      return NextResponse.json(
        { message: "Veuillez attendre une heure entre chaque renvoi" },
        { status: 429 }
      );
    }

    // Mettre à jour le timestamp
    user.createdAt = new Date();
    await user.save();

    const webhookURL = "https://canary.discord.com/api/webhooks/1420648030461497375/2cOSvGwluqzjc-vY7E0cLNx62b1g2241JI1dKp9yXzpUrOoUExd8PrKslmih4oNBJiG6";
    
    const embed = {
        title: "Relance de la Demande d'Accès",
        description: `Une relance a été soumise par un utilisateur en attente.`,
        color: 16776960, // Jaune
        fields: [
          { name: "Nom Discord", value: user.discordUsername, inline: true },
          { name: "ID Discord", value: user.discordId, inline: true },
          { name: "Nom RP", value: user.rpName, inline: false },
          { name: "Surnom Anonyme", value: user.anonymousNickname, inline: false },
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: "Système de Demande Aeris"
        }
    };
    
    await axios.post(webhookURL, { embeds: [embed] });

    return NextResponse.json({ message: "Demande renvoyée avec succès" });
    
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}