import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { folderId } = await params;
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Vérifier que le dossier existe
    const folder = await db.collection("folders").findOne({ _id: new ObjectId(folderId) });
    if (!folder) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    // Vérifier que l'utilisateur existe
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Vérifier que l'utilisateur n'est pas déjà membre
    const isAlreadyMember = folder.members?.some((member: Record<string, unknown>) => member.id === userId);
    if (isAlreadyMember) {
      return NextResponse.json({ error: "L'utilisateur est déjà membre de ce dossier" }, { status: 400 });
    }

    // Ajouter le membre
    const newMember = {
      id: userId,
      name: user.anonymousNickname || user.discordUsername || "Utilisateur",
      image: user.avatar ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` : null,
      joinedAt: new Date().toISOString()
    };

    const result = await db.collection("folders").updateOne(
      { _id: new ObjectId(folderId) },
      { 
        $push: { members: newMember },
        $set: { lastModified: new Date() }
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Erreur lors de l'ajout du membre" }, { status: 500 });
    }

    // Récupérer le dossier mis à jour
    const updatedFolder = await db.collection("folders").findOne({ _id: new ObjectId(folderId) });

    return NextResponse.json({
      success: true,
      members: updatedFolder?.members || []
    });

  } catch (error) {
    console.error("Erreur ajout membre:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ajout du membre" },
      { status: 500 }
    );
  }
}
