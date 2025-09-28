import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId, UpdateFilter } from "mongodb";

type Member = { id: string; name?: string };
type FolderDoc = { _id: ObjectId; ownerId: string; members: Member[] };

export async function DELETE(
  request: Request,
  context: { params: { folderId: string; memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !("role" in session.user) || session.user.role !== "admin") {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { folderId, memberId } = context.params;
    const { db } = await connectToDatabase();

    // Vérifier que le dossier existe
    const folder = await db.collection<FolderDoc>("folders").findOne({ _id: new ObjectId(folderId) });
    if (!folder) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    // Vérifier que la personne à supprimer n'est pas le propriétaire
    if (folder.ownerId === memberId) {
      return NextResponse.json(
        { error: "Impossible de retirer le propriétaire du dossier" },
        { status: 400 }
      );
    }

    // Supprimer le membre de la liste (typé pour Mongo)
    const update: UpdateFilter<FolderDoc> = { $pull: { members: { id: memberId } } };
    const result = await db.collection<FolderDoc>("folders").updateOne(
      { _id: new ObjectId(folderId) },
      update
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