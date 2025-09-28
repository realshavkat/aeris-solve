import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId, UpdateFilter } from "mongodb";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string, memberId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { folderId, memberId } = await params;
    const { db } = await connectToDatabase();

    // Vérifier que le dossier existe
    const folder = await db.collection("folders").findOne({ _id: new ObjectId(folderId) });
    if (!folder) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    // Vérifier que la personne à supprimer n'est pas le propriétaire
    if (folder.ownerId === memberId) {
      return NextResponse.json({ 
        error: "Impossible de retirer le propriétaire du dossier" 
      }, { status: 400 });
    }

    type Folder = { _id: ObjectId; members: { id: string; name?: string }[] };

    // Supprimer le membre de la liste (typé pour Mongo)
    const result = await db.collection<Folder>("folders").updateOne(
      { _id: new ObjectId(folderId) },
      { $pull: { members: { id: memberId } } } satisfies UpdateFilter<Folder>
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Membre non trouvé dans ce dossier" }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur suppression membre:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du membre" },
      { status: 500 }
    );
  }
}
