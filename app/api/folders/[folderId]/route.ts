import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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
                      folder.members?.some((member: Record<string, unknown>) => member.id === session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    // Compter les rapports dans ce dossier
    const reportsCount = await db.collection("reports").countDocuments({
      folderId: folderId
    });

    const folderWithCount = {
      ...folder,
      reportsCount
    };

    return NextResponse.json(folderWithCount);
  } catch (error) {
    console.error("Erreur récupération dossier:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
