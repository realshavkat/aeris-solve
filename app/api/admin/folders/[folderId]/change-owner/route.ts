import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { folderId } = await params;
    const { newOwnerId } = await request.json();
    const { db } = await connectToDatabase();

    // Vérifier que le dossier existe
    const folder = await db.collection("folders").findOne({
      _id: new ObjectId(folderId)
    });

    if (!folder) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    // Vérifier que le nouvel utilisateur existe et est approuvé
    const newOwner = await db.collection("users").findOne({
      _id: new ObjectId(newOwnerId),
      status: "approved"
    });

    if (!newOwner) {
      return NextResponse.json({ error: "Utilisateur non trouvé ou non approuvé" }, { status: 404 });
    }

    // Mettre à jour le propriétaire du dossier
    const result = await db.collection("folders").updateOne(
      { _id: new ObjectId(folderId) },
      { 
        $set: { 
          ownerId: newOwnerId,
          lastModified: new Date(),
          creator: {
            name: newOwner.anonymousNickname || newOwner.nickname || "Utilisateur",
            discordId: newOwner.discordId
          }
        }
      }
    );

    // S'assurer que le nouveau propriétaire est dans les membres
    await db.collection("folders").updateOne(
      { _id: new ObjectId(folderId) },
      {
        $addToSet: {
          members: {
            id: newOwnerId,
            name: newOwner.anonymousNickname || newOwner.nickname || "Utilisateur",
            image: newOwner.avatar ? `https://cdn.discordapp.com/avatars/${newOwner.discordId}/${newOwner.avatar}.png` : null,
            joinedAt: new Date()
          }
        }
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Erreur lors du changement de propriétaire" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur changement propriétaire:", error);
    return NextResponse.json(
      { error: "Erreur lors du changement de propriétaire" },
      { status: 500 }
    );
  }
}
