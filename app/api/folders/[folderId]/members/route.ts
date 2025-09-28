import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { folderId } = await params;
    const { db } = await connectToDatabase();
    
    const folder = await db.collection("folders").findOne({
      _id: new ObjectId(folderId)
    });

    if (!folder) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    // Vérifier que l'utilisateur a accès au dossier
    const hasAccess = folder.ownerId === session.user.id || 
                      folder.members?.some((member: any) => member.id === session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    return NextResponse.json({ members: folder.members || [] });
  } catch (error) {
    console.error("Erreur récupération membres:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { folderId } = await params;
    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: "ID du membre requis" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    const folder = await db.collection("folders").findOne({
      _id: new ObjectId(folderId)
    });

    if (!folder) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    // Seul le propriétaire peut retirer des membres
    if (folder.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Seul le propriétaire peut retirer des membres" }, { status: 403 });
    }

    // Empêcher de retirer le propriétaire
    if (memberId === folder.ownerId) {
      return NextResponse.json({ error: "Impossible de retirer le propriétaire" }, { status: 400 });
    }

    // Retirer le membre
    const result = await db.collection("folders").updateOne(
      { _id: new ObjectId(folderId) },
      { 
        $pull: { members: { id: memberId } },
        $set: { lastModified: new Date() }
      }
    );

    if (!result.matchedCount) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    // Récupérer le dossier mis à jour
    const updatedFolder = await db.collection("folders").findOne({
      _id: new ObjectId(folderId)
    });

    return NextResponse.json(updatedFolder);
  } catch (error) {
    console.error("Erreur suppression membre:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du membre" },
      { status: 500 }
    );
  }
}
