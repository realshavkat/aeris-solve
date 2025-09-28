// Fichier: app/api/register/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import axios from "axios";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    const { rpName, anonymousNickname } = await request.json();

    if (!rpName || !anonymousNickname) {
      return NextResponse.json(
        { message: "Les champs Nom RP et Surnom Anonyme sont requis." },
        { status: 400 }
      );
    }

    const user = await db.collection("users").findOne({
      _id: new ObjectId(session.user.id)
    });
    
    if (!user) {
      return NextResponse.json({ message: "Utilisateur non trouvé." }, { status: 404 });
    }

    // Mettre à jour l'utilisateur avec les nouvelles informations
    await db.collection("users").updateOne(
      { _id: new ObjectId(session.user.id) },
      {
        $set: {
          rpName: rpName.trim(),
          anonymousNickname: anonymousNickname.trim(),
          status: "pending",
          updatedAt: new Date()
        }
      }
    );

    // Envoyer le webhook Discord
    const webhookUrl = "https://canary.discord.com/api/webhooks/1420648030461497375/2cOSvGwluqzjc-vY7E0cLNx62b1g2241JI1dKp9yXzpUrOoUExd8PrKslmih4oNBJiG6";
    
    const embed = {
      title: "Nouvelle demande d'accès",
      description: "Une nouvelle demande a été soumise pour le serveur Aeris.",
      color: 3447003,
      fields: [
        {
          name: "Nom Discord",
          value: user.discordUsername || "Non défini",
          inline: true
        },
        {
          name: "ID Discord",
          value: user.discordId || "Non défini",
          inline: true
        },
        {
          name: "Nom RP",
          value: rpName,
          inline: false
        },
        {
          name: "Surnom Anonyme",
          value: anonymousNickname,
          inline: false
        }
      ],
      timestamp: new Date().toISOString()
    };

    try {
      await axios.post(webhookUrl, { embeds: [embed] });
    } catch (webhookError) {
      console.error("Erreur webhook Discord:", webhookError);
      // Ne pas faire échouer la requête si le webhook échoue
    }

    return NextResponse.json({ 
      message: "Enregistrement réussi.",
      status: "pending"
    });

  } catch (error) {
    console.error("Erreur lors de l'enregistrement:", error);
    return NextResponse.json({ 
      message: "Erreur de connexion à la base de données." 
    }, { status: 500 });
  }
}