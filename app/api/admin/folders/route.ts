import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    // Pour chaque dossier, compter les rapports associés
    const folders = await db.collection("folders").find().toArray();
    
    // Récupérer le compte des rapports pour chaque dossier
    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
        // Compter les rapports associés à ce dossier
        const reportsCount = await db.collection("reports").countDocuments({
          folderId: folder._id.toString()
        });
        
        // Ajouter le compte des membres
        const membersCount = folder.members?.length || 0;
        
        return {
          ...folder,
          reportsCount,
          membersCount
        };
      })
    );

    return NextResponse.json(foldersWithCounts);

  } catch (error) {
    console.error("Erreur chargement dossiers admin:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des dossiers" },
      { status: 500 }
    );
  }
}