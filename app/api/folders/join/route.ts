import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { accessKey } = await request.json();

    if (!accessKey) {
      return NextResponse.json({ error: "Clé d'accès requise" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Récupérer les infos de l'utilisateur actuel
    const currentUser = await db.collection("users").findOne({
      _id: new ObjectId(session.user.id)
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Chercher le dossier avec cette clé d'accès
    const folder = await db.collection("folders").findOne({
      accessKey: accessKey.trim()
    });

    if (!folder) {
      return NextResponse.json({ error: "Clé d'accès invalide" }, { status: 404 });
    }

    // Empêcher le propriétaire de rejoindre son propre dossier
    if (folder.ownerId === session.user.id) {
      return NextResponse.json({ 
        error: "Vous ne pouvez pas rejoindre votre propre dossier" 
      }, { status: 400 });
    }

    // Vérifier si l'utilisateur est déjà membre
    const isAlreadyMember = folder.members?.some((member: Record<string, unknown>) => member.id === session.user.id);
    
    if (isAlreadyMember) {
      return NextResponse.json({ 
        error: "Vous êtes déjà membre de ce dossier" 
      }, { status: 400 });
    }

    // Ajouter l'utilisateur aux membres
    const newMember = {
      id: session.user.id,
      name: currentUser.anonymousNickname || currentUser.discordUsername || "Utilisateur",
      joinedAt: new Date().toISOString()
    };

    const result = await db.collection("folders").updateOne(
      { _id: folder._id },
      { 
        $push: { members: newMember },
        $set: { lastModified: new Date() }
      }
    );

    if (!result.matchedCount) {
      return NextResponse.json({ error: "Erreur lors de l'ajout au dossier" }, { status: 500 });
    }

    // Récupérer le dossier mis à jour
    const updatedFolder = await db.collection("folders").findOne({
      _id: folder._id
    });

    // Compter les rapports
    const reportsCount = await db.collection("reports").countDocuments({
      folderId: folder._id.toString()
    });

    const folderWithCount = {
      ...updatedFolder,
      reportsCount
    };

    return NextResponse.json(folderWithCount);
  } catch (error) {
    console.error("Erreur rejoindre dossier:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'accès au dossier" },
      { status: 500 }
    );
  }
}