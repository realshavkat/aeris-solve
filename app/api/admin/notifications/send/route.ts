import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import axios from "axios";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { title, message, userIds, importance = 'medium' } = await request.json();

    if (!title?.trim() || !message?.trim() || !userIds?.length) {
      return NextResponse.json(
        { error: "Titre, message et utilisateurs sont requis" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Récupérer les informations de l'admin qui envoie
    const adminUser = await db.collection("users").findOne({
      _id: new ObjectId(session.user.id)
    });

    if (!adminUser) {
      return NextResponse.json({ error: "Utilisateur admin non trouvé" }, { status: 404 });
    }

    // Récupérer les utilisateurs destinataires
    const recipients = await db.collection("users").find({
      _id: { $in: userIds.map((id: string) => new ObjectId(id)) }
    }).toArray();

    if (recipients.length === 0) {
      return NextResponse.json({ error: "Aucun destinataire trouvé" }, { status: 404 });
    }

    // Créer les notifications pour chaque utilisateur avec importance
    const notifications = recipients.map(recipient => ({
      userId: recipient._id.toString(),
      title: title.trim(),
      message: message.trim(),
      type: "admin_announcement",
      importance: importance, // Ajout du niveau d'importance
      read: false,
      createdAt: new Date(),
      sender: {
        id: adminUser._id.toString(),
        name: adminUser.anonymousNickname || adminUser.discordUsername || "Administrateur"
      }
    }));

    // Insérer toutes les notifications
    const notificationResult = await db.collection("notifications").insertMany(notifications);

    // Enregistrer l'historique de la notification envoyée
    await db.collection("sent_notifications").insertOne({
      title: title.trim(),
      message: message.trim(),
      recipientCount: recipients.length,
      recipientIds: userIds,
      createdAt: new Date(),
      sender: {
        id: adminUser._id.toString(),
        name: adminUser.anonymousNickname || adminUser.discordUsername || "Administrateur"
      }
    });

    // Envoyer les messages Discord privés avec couleur selon importance
    let discordMessagesSent = 0;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    // Couleurs selon l'importance
    const importanceColors = {
      low: 0x3498db,      // Bleu
      medium: 0x95a5a6,   // Gris
      high: 0xf39c12,     // Orange
      critical: 0xe74c3c  // Rouge
    };

    const importanceEmojis = {
      low: '📘',
      medium: '🔔',
      high: '⚠️',
      critical: '🚨'
    };

    if (botToken) {
      for (const recipient of recipients) {
        try {
          // Créer un DM avec l'utilisateur
          const dmResponse = await axios.post(
            'https://discord.com/api/v10/users/@me/channels',
            {
              recipient_id: recipient.discordId
            },
            {
              headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (dmResponse.data?.id) {
            // Envoyer le message avec couleur et emoji selon importance
            await axios.post(
              `https://discord.com/api/v10/channels/${dmResponse.data.id}/messages`,
              {
                embeds: [{
                  title: `${importanceEmojis[importance as keyof typeof importanceEmojis]} ${title.trim()}`,
                  description: message.trim(),
                  color: importanceColors[importance as keyof typeof importanceColors],
                  fields: [{
                    name: "Niveau d'importance",
                    value: importance === 'low' ? 'Info' :
                           importance === 'medium' ? 'Normal' :
                           importance === 'high' ? 'Important' : 'Critique',
                    inline: true
                  }],
                  footer: {
                    text: "Connectez-vous sur Aeris pour voir toutes vos notifications"
                  },
                  timestamp: new Date().toISOString()
                }]
              },
              {
                headers: {
                  'Authorization': `Bot ${botToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            discordMessagesSent++;
          }
        } catch (discordError) {
          console.error(`Erreur envoi Discord pour ${recipient.discordId}:`, discordError);
          // Ne pas faire échouer la requête si un message Discord échoue
        }
      }
    }

    return NextResponse.json({
      message: "Notifications envoyées avec succès",
      notificationsSent: notificationResult.insertedCount,
      discordMessagesSent,
      recipients: recipients.length
    });

  } catch (error) {
    console.error("Erreur envoi notifications:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi des notifications" },
      { status: 500 }
    );
  }
}
