import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { ObjectId } from "mongodb";

interface FolderMember {
  id: string;
}

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
    
    // CORRECTION: Valider l'ObjectId avant de faire la requête
    if (!ObjectId.isValid(folderId)) {
      return NextResponse.json({ error: "ID de dossier invalide" }, { status: 400 });
    }

    // AJOUT: Vérifier le mode admin depuis les paramètres de requête
    const { searchParams } = new URL(request.url);
    const adminMode = searchParams.get('adminMode') === 'true';

    const { db } = await connectToDatabase();
    
    const folder = await db.collection("folders").findOne({
      _id: new ObjectId(folderId)
    });

    if (!folder) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    // AJOUT: Logique d'accès mise à jour pour le mode admin
    const isOwner = folder.ownerId === session.user.id;
    const isMember = folder.members?.some((member: FolderMember) => member.id === session.user.id);
    
    // CORRECTION: Le mode admin ne s'applique que si ce n'est pas notre propre dossier
    const isAdminAccess = adminMode && (session.user as { role?: string }).role === 'admin' && !isOwner;
    
    if (!isOwner && !isMember && !isAdminAccess) {
      console.log(`Accès refusé au dossier ${folderId} pour l&apos;utilisateur ${session.user.id}`);
      return NextResponse.json({ 
        error: "Vous n&apos;avez pas accès à ce dossier" 
      }, { status: 403 });
    }

    // Compter les rapports dans ce dossier
    const reportsCount = await db.collection("reports").countDocuments({
      folderId: folderId
    });

    const folderWithCount = {
      ...folder,
      reportsCount,
      // AJOUT: Indiquer si l'accès se fait en mode admin (seulement si pas propriétaire)
      adminAccess: isAdminAccess
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
