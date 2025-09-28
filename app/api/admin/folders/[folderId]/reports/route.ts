import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { folderId } = await params;
    const { db } = await connectToDatabase();

    // Vérifier si le dossier existe
    const folder = await db.collection("folders").findOne({ _id: new ObjectId(folderId) });
    
    if (!folder) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    // Récupérer tous les rapports de ce dossier
    const reports = await db.collection("reports")
      .find({ folderId: folderId })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json(reports);

  } catch (error) {
    console.error("Erreur récupération rapports:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des rapports" },
      { status: 500 }
    );
  }
}
