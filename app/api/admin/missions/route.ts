import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import axios from "axios";
import { discordLogger } from "@/lib/discord-logger";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    const missions = await db.collection("missions")
      .find({})
      .sort({ 
        status: 1, // En cours (0) avant terminé/annulé (1,2)
        priority: -1, // Priorité haute avant basse
        createdAt: -1 
      })
      .toArray();

    return NextResponse.json(missions);

  } catch (error) {
    console.error("Erreur récupération missions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des missions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { title, description, priority, sendNotification, assignedUserIds } = await request.json();

    if (!title?.trim() || !description?.trim() || !assignedUserIds?.length) {
      return NextResponse.json(
        { error: "Titre, description et utilisateurs assignés sont requis" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Récupérer les informations de l'admin qui crée
    const adminUser = await db.collection("users").findOne({
      _id: new ObjectId(session.user.id)
    });

    if (!adminUser) {
      return NextResponse.json({ error: "Utilisateur admin non trouvé" }, { status: 404 });
    }

    // Récupérer les utilisateurs assignés
    const assignedUsers = await db.collection("users").find({
      _id: { $in: assignedUserIds.map((id: string) => new ObjectId(id)) }
    }).toArray();

    if (assignedUsers.length === 0) {
      return NextResponse.json({ error: "Aucun utilisateur assigné trouvé" }, { status: 404 });
    }

    // Créer la mission
    const newMission = {
      title: title.trim(),
      description: description.trim(),
      priority: priority || 'medium',
      status: 'in_progress', // en_cours, completed, cancelled
      assignedUsers: assignedUsers.map(user => ({
        id: user._id.toString(),
        name: user.anonymousNickname || user.discordUsername,
        discordId: user.discordId
      })),
      createdBy: {
        id: adminUser._id.toString(),
        name: adminUser.anonymousNickname || adminUser.discordUsername || "Administrateur"
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection("missions").insertOne(newMission);

    // Initialiser la variable discordMessagesSent ici
    let discordMessagesSent = 0;

    // Envoyer des notifications si demandé
    if (sendNotification) {
      const notifications = assignedUsers.map(user => ({
        userId: user._id.toString(),
        title: `🎯 Nouvelle mission: ${title.trim()}`,
        message: `Vous avez été assigné(e) à une nouvelle mission.\n\n${description.trim()}`,
        type: "mission_assigned",
        importance: priority,
        read: false,
        createdAt: new Date(),
        sender: {
          id: adminUser._id.toString(),
          name: adminUser.anonymousNickname || adminUser.discordUsername || "Administrateur"
        }
      }));

      await db.collection("notifications").insertMany(notifications);

      // Envoyer les messages Discord
      const botToken = process.env.DISCORD_BOT_TOKEN;

      const priorityColors = {
        low: 0x3498db,      // Bleu
        medium: 0xf39c12,   // Orange
        high: 0xe74c3c,     // Rouge
        critical: 0x8e44ad  // Violet
      };

      const priorityEmojis = {
        low: '📘',
        medium: '🎯',
        high: '🔥',
        critical: '⚡'
      };

      if (botToken) {
        for (const user of assignedUsers) {
          try {
            const dmResponse = await axios.post(
              'https://discord.com/api/v10/users/@me/channels',
              { recipient_id: user.discordId },
              {
                headers: {
                  'Authorization': `Bot ${botToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            if (dmResponse.data?.id) {
              await axios.post(
                `https://discord.com/api/v10/channels/${dmResponse.data.id}/messages`,
                {
                  embeds: [{
                    title: `${priorityEmojis[priority as keyof typeof priorityEmojis]} Nouvelle Mission Assignée`,
                    description: `**${title.trim()}**\n\n${description.trim()}`,
                    color: priorityColors[priority as keyof typeof priorityColors],
                    fields: [{
                      name: "Priorité",
                      value: priority === 'low' ? 'Basse' :
                             priority === 'medium' ? 'Moyenne' :
                             priority === 'high' ? 'Élevée' : 'Critique',
                      inline: true
                    }, {
                      name: "Assigné par",
                      value: adminUser.anonymousNickname || adminUser.discordUsername || "Administrateur",
                      inline: true
                    }],
                    footer: {
                      text: "Consultez vos missions sur Aeris"
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
            console.error(`Erreur envoi Discord pour ${user.discordId}:`, discordError);
          }
        }
      }
    }

    const createdMission = await db.collection("missions").findOne({ 
      _id: result.insertedId 
    });

    // Log Discord
    try {
      await discordLogger.logMissionCreatedByAdmin(
        {
          name: adminUser.anonymousNickname || adminUser.discordUsername || "Administrateur",
          discordId: adminUser.discordId
        },
        {
          title: createdMission.title,
          description: createdMission.description,
          _id: createdMission._id.toString(),
          priority: createdMission.priority,
          assignedUsers: createdMission.assignedUsers
        }
      );
    } catch (logError) {
      console.error("Erreur log Discord:", logError);
    }

    return NextResponse.json({
      message: "Mission créée avec succès",
      mission: createdMission,
      notificationsSent: sendNotification ? assignedUsers.length : 0,
      discordMessagesSent: discordMessagesSent // Maintenant définie correctement
    });

  } catch (error) {
    console.error("Erreur création mission:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la mission" },
      { status: 500 }
    );
  }
}