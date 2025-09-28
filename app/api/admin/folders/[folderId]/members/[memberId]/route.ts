// kuragiri/app/api/admin/folders/[folderId]/members/[memberId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId, UpdateFilter } from "mongodb";

type Member = { id: string; name?: string };
type FolderDoc = { _id: ObjectId; ownerId: string; members: Member[] };

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !("role" in session.user) || session.user.role !== "admin") {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { folderId } = await params;

    // 1) Récupère memberId : priorité à l'URL, sinon dans le body
    let memberId = new URL(request.url).searchParams.get("memberId") ?? undefined;
    if (!memberId) {
      try {
        const body = await request.json();
        if (typeof body?.memberId === "string") memberId = body.memberId;
      } catch {
        /* pas de body JSON -> ignore */
      }
    }
    if (!memberId?.trim()) {
      return NextResponse.json({ error: "memberId est requis (query ?memberId= ou body JSON)" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // 2) Vérifie que le dossier existe
    const folder = await db
      .collection<FolderDoc>("folders")
      .findOne({ _id: new ObjectId(folderId) });
    if (!folder) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    // 3) Empêche la suppression du propriétaire
    if (folder.ownerId === memberId) {
      return NextResponse.json(
        { error: "Impossible de retirer le propriétaire du dossier" },
        { status: 400 }
      );
    }

    // 4) Supprime le membre (type-safe)
    const update: UpdateFilter<FolderDoc> = { $pull: { members: { id: memberId } } };
    const result = await db
      .collection<FolderDoc>("folders")
      .updateOne({ _id: new ObjectId(folderId) }, update);

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
