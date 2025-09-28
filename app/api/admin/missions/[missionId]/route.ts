import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import axios from "axios";
import { discordLogger } from "@/lib/discord-logger";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ missionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { missionId } = await params;
    const body = await request.json();
    const { status, title, description, priority, assignedUserIds } = body;

    const { db } = await connectToDatabase();

    // Construire l'objet de mise à jour
    const updateData: any = {
      updatedAt: new Date()
    };

    if (status !== undefined) {
      updateData.status = status;
    }

    if (title !== undefined) {
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description.trim();
    }

    if (priority !== undefined) {
      updateData.priority = priority;
    }

    // Gestion des membres assignés avec notifications optionnelles
    if (assignedUserIds !== undefined) {
      const assignedUsers = await db.collection("users").find({
        _id: { $in: assignedUserIds.map((id: string) => new ObjectId(id)) }
      }).toArray();

      const currentMission = await db.collection("missions").findOne({
        _id: new ObjectId(missionId)
      });

      if (currentMission) {
        // Identifier les nouveaux membres (qui n'étaient pas assignés avant)
        const currentUserIds = currentMission.assignedUsers.map((user: any) => user.id);
        const newUserIds = assignedUserIds.filter((id: string) => !currentUserIds.includes(id));
        
        // Créer des notifications pour les nouveaux membres seulement
        if (newUserIds.length > 0) {
          const adminUser = await db.collection("users").findOne({
            _id: new ObjectId(session.user.id)
          });

          const newNotifications = newUserIds.map((userId: string) => ({
            userId: userId,
            title: `🎯 Ajouté à la mission: ${title || currentMission.title}`,
            message: `Vous avez été ajouté(e) à une mission existante.\n\n${description || currentMission.description}`,
            type: "mission_assigned",
            importance: priority || currentMission.priority,
            read: false,
            createdAt: new Date(),
            sender: {
              id: adminUser?._id.toString(),
              name: adminUser?.anonymousNickname || adminUser?.discordUsername || "Administrateur"
            }
          }));

          await db.collection("notifications").insertMany(newNotifications);

          // Envoyer des messages Discord pour les nouveaux membres
          const botToken = process.env.DISCORD_BOT_TOKEN;
          if (botToken) {
            const priorityColors = {
              low: 0x3498db,
              medium: 0xf39c12,
              high: 0xe74c3c,
              critical: 0x8e44ad
            };

            const priorityEmojis = {
              low: '📘',
              medium: '🎯',
              high: '🔥',
              critical: '⚡'
            };

            for (const userId of newUserIds) {
              const user = assignedUsers.find(u => u._id.toString() === userId);
              if (user?.discordId) {
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
                          title: `${priorityEmojis[priority as keyof typeof priorityEmojis] || '🎯'} Ajouté à une Mission`,
                          description: `**${title || currentMission.title}**\n\n${description || currentMission.description}`,
                          color: priorityColors[priority as keyof typeof priorityColors] || 0xf39c12,
                          fields: [{
                            name: "Priorité",
                            value: priority === 'low' ? 'Basse' :
                                   priority === 'medium' ? 'Moyenne' :
                                   priority === 'high' ? 'Élevée' : 'Critique',
                            inline: true
                          }, {
                            name: "Ajouté par",
                            value: adminUser?.anonymousNickname || adminUser?.discordUsername || "Administrateur",
                            inline: true
                          }],
                          footer: {
                            text: "Consultez vos missions sur Aerys"
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
                  }
                } catch (discordError) {
                  console.error(`Erreur envoi Discord pour ${user.discordId}:`, discordError);
                }
              }
            }
          }
        }
      }

      updateData.assignedUsers = assignedUsers.map(user => ({
        id: user._id.toString(),
        name: user.anonymousNickname || user.discordUsername,
        discordId: user.discordId
      }));
    }

    const result = await db.collection("missions").updateOne(
      { _id: new ObjectId(missionId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Mission non trouvée" }, { status: 404 });
    }

    const updatedMission = await db.collection("missions").findOne({
      _id: new ObjectId(missionId)
    });

    // Log Discord pour les changements de statut
    if (status !== undefined) {
      try {
        const adminUser = await db.collection("users").findOne({
          _id: new ObjectId(session.user.id)
        });

        await discordLogger.logMissionStatusChangedByAdmin(
          {
            name: adminUser?.anonymousNickname || adminUser?.discordUsername || "Administrateur",
            discordId: adminUser?.discordId || "unknown"
          },
          {
            title: updatedMission.title,
            _id: updatedMission._id.toString(),
            oldStatus: "previous", // Vous pouvez récupérer l'ancien statut si nécessaire
            newStatus: status
          }
        );
      } catch (logError) {
        console.error("Erreur log Discord:", logError);
      }
    }

    return NextResponse.json({
      message: "Mission mise à jour avec succès",
      mission: updatedMission
    });

  } catch (error) {
    console.error("Erreur mise à jour mission:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la mission" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ missionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { missionId } = await params;
    const { db } = await connectToDatabase();

    // Récupérer la mission avant suppression pour le log
    const mission = await db.collection("missions").findOne({
      _id: new ObjectId(missionId)
    });

    if (!mission) {
      return NextResponse.json({ error: "Mission non trouvée" }, { status: 404 });
    }

    const result = await db.collection("missions").deleteOne({
      _id: new ObjectId(missionId)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Mission non trouvée" }, { status: 404 });
    }

    // Log Discord
    try {
      const adminUser = await db.collection("users").findOne({
        _id: new ObjectId(session.user.id)
      });

      await discordLogger.logMissionDeletedByAdmin(
        {
          name: adminUser?.anonymousNickname || adminUser?.discordUsername || "Administrateur",
          discordId: adminUser?.discordId || "unknown"
        },
        {
          title: mission.title,
          _id: mission._id.toString(),
          assignedUsersCount: mission.assignedUsers?.length || 0
        }
      );
    } catch (logError) {
      console.error("Erreur log Discord:", logError);
    }

    return NextResponse.json({ message: "Mission supprimée avec succès" });

  } catch (error) {
    console.error("Erreur suppression mission:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la mission" },
      { status: 500 }
    );
  }
}
