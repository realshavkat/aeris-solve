import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { ObjectId } from "mongodb";
import { discordLogger } from "@/lib/discord-logger"; // AJOUT

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    if (!folderId) {
      return NextResponse.json({ error: "folderId requis" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Utiliser directement MongoDB au lieu de Mongoose
    const reports = await db.collection("reports")
      .find({ folderId })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Erreur récupération rapports:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
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

    const body = await request.json();
    const { title, content, importance, tags, color, icon, folderId } = body;

    if (!title || !content || !folderId) {
      return NextResponse.json(
        { error: "Titre, contenu et folderId sont requis" },
        { status: 400 }
      );
    }

    // Récupérer les infos utilisateur et dossier
    const [user, folder] = await Promise.all([
      db.collection("users").findOne({ _id: new ObjectId(session.user.id) }),
      db.collection("folders").findOne({ _id: new ObjectId(folderId) })
    ]);

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    if (!folder) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    const newReport = {
      title,
      content,
      importance: importance || 'medium',
      tags: tags || [],
      color: color || '#1e293b',
      icon: icon || '📄',
      folderId,
      authorId: session.user.id,
      author: {
        name: user.anonymousNickname || user.discordUsername || 'Utilisateur',
        discordId: user.discordId
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection("reports").insertOne(newReport);

    if (!result.insertedId) {
      throw new Error("Erreur lors de la création du rapport");
    }

    const savedReport = await db.collection("reports").findOne({ _id: result.insertedId });
    if (!savedReport) {
      return NextResponse.json({ error: "Rapport créé introuvable" }, { status: 500 });
    }

    // AJOUT: Log Discord
    try {
      await discordLogger.logReportCreated(
        {
          name: user.anonymousNickname || user.discordUsername || "Utilisateur",
          discordId: user.discordId,
        },
        {
          title: savedReport.title,
          _id: savedReport._id.toString(),
          importance: savedReport.importance,
        },
        {
          title: folder.title,
          _id: folder._id.toString(),
        }
      );
    } catch (logError) {
      console.error("Erreur log Discord:", logError);
    }

    return NextResponse.json(savedReport, { status: 201 });

  } catch (error) {
    console.error("Erreur création rapport:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du rapport" },
      { status: 500 }
    );
  }
}