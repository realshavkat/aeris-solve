import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { ObjectId, UpdateFilter } from "mongodb";

type Member = { id: string; name: string; joinedAt: string };
type FolderDoc = { _id: ObjectId; ownerId: string; accessKey?: string; members?: Member[]; lastModified?: Date };
type UserDoc = { _id: ObjectId; anonymousNickname?: string; discordUsername?: string; discordId?: string };

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

    // User courant
    const currentUser = await db.collection<UserDoc>("users").findOne({
      _id: new ObjectId(session.user.id),
    });
    if (!currentUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Dossier par accessKey
    const folder = await db.collection<FolderDoc>("folders").findOne({
      accessKey: accessKey.trim(),
    });
    if (!folder) {
      return NextResponse.json({ error: "Clé d'accès invalide" }, { status: 404 });
    }

    // Empêcher le propriétaire de rejoindre
    if (folder.ownerId === session.user.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas rejoindre votre propre dossier" }, { status: 400 });
    }

    // Déjà membre ?
    const isAlreadyMember = (folder.members ?? []).some((m) => m.id === session.user.id);
    if (isAlreadyMember) {
      return NextResponse.json({ error: "Vous êtes déjà membre de ce dossier" }, { status: 400 });
    }

    // Nouveau membre
    const newMember: Member = {
      id: session.user.id,
      name: currentUser.anonymousNickname ?? currentUser.discordUsername ?? "Utilisateur",
      joinedAt: new Date().toISOString(),
    };

    // Update typé
    const update: UpdateFilter<FolderDoc> = {
      $push: { members: newMember },
      $set: { lastModified: new Date() },
    };

    const result = await db
      .collection<FolderDoc>("folders")
      .updateOne({ _id: folder._id }, update);

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Erreur lors de l'ajout au dossier" }, { status: 500 });
    }

    const updatedFolder = await db
      .collection<FolderDoc>("folders")
      .findOne({ _id: folder._id });

    if (!updatedFolder) {
      return NextResponse.json({ error: "Dossier mis à jour introuvable" }, { status: 500 });
    }

    const reportsCount = await db.collection("reports").countDocuments({
      folderId: updatedFolder._id.toString(),
    });

    return NextResponse.json({ ...updatedFolder, reportsCount });
  } catch (error) {
    console.error("Erreur rejoindre dossier:", error);
    return NextResponse.json({ error: "Erreur lors de l'accès au dossier" }, { status: 500 });
  }
}
