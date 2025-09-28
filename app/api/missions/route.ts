import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { ObjectId } from "mongodb";
import { discordLogger } from "@/lib/discord-logger";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Récupérer les missions assignées à l'utilisateur
    const missions = await db.collection("missions")
      .find({
        "assignedUsers.id": session.user.id
      })
      .sort({ 
        status: 1, // En cours avant terminé/annulé
        priority: -1, // Priorité haute avant basse
        createdAt: -1 
      })
      .toArray();

    return NextResponse.json(missions);

  } catch (error) {
    console.error("Erreur récupération missions utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des missions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    const user = await db.collection("users").findOne({
      _id: new ObjectId(session.user.id)
    });
    
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, priority, dueDate } = body;

    if (!title || !description) {
      return NextResponse.json({ error: "Titre et description requis" }, { status: 400 });
    }

    const newMission = {
      title: title.trim(),
      description: description.trim(),
      priority: priority || 'medium',
      status: 'pending',
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: {
        id: user._id.toString(),
        name: user.anonymousNickname || user.discordUsername || "Utilisateur",
        discordId: user.discordId
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection("missions").insertOne(newMission);
    
    if (!result.insertedId) {
      throw new Error("Erreur lors de la création de la mission");
    }

    const createdMission = await db.collection("missions").findOne({ 
      _id: result.insertedId 
    });

    // Log Discord
    try {
      await discordLogger.logMissionCreated(
        {
          name: user.anonymousNickname || user.discordUsername || "Utilisateur",
          discordId: user.discordId
        },
        {
          title: createdMission.title,
          description: createdMission.description,
          _id: createdMission._id.toString()
        }
      );
    } catch (logError) {
      console.error("Erreur log Discord:", logError);
    }

    return NextResponse.json(createdMission, { status: 201 });
  } catch (error) {
    console.error("Erreur création mission:", error);
    return NextResponse.json({ error: "Erreur lors de la création de la mission" }, { status: 500 });
  }
}
