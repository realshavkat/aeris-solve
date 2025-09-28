import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { folderId, accessKey } = await request.json();

    if (!folderId || !accessKey) {
      return NextResponse.json({ error: "folderId et accessKey requis" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Vérifier que l'utilisateur est propriétaire du dossier
    const folder = await db.collection("folders").findOne({
      _id: new ObjectId(folderId)
    });

    if (!folder) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    if (folder.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Seul le propriétaire peut générer une clé d'accès" }, { status: 403 });
    }

    // Vérifier que la clé n'est pas déjà utilisée par un autre dossier
    const existingFolder = await db.collection("folders").findOne({
      accessKey: accessKey,
      _id: { $ne: new ObjectId(folderId) }
    });

    if (existingFolder) {
      return NextResponse.json({ error: "Cette clé d'accès est déjà utilisée" }, { status: 400 });
    }

    // Mettre à jour la clé d'accès
    const result = await db.collection("folders").updateOne(
      { _id: new ObjectId(folderId) },
      { 
        $set: { 
          accessKey: accessKey,
          lastModified: new Date()
        }
      }
    );

    if (!result.matchedCount) {
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }

    return NextResponse.json({ success: true, accessKey });
  } catch (error) {
    console.error("Erreur génération clé d'accès:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération de la clé d'accès" },
      { status: 500 }
    );
  }
}