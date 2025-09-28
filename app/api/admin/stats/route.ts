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

    // Compter les utilisateurs par statut
    const userStats = await db.collection("users").aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // Organiser les stats utilisateurs
    const totalUsers = userStats.reduce((sum, stat) => sum + stat.count, 0);
    const pendingUsers = userStats.find(s => s._id === 'pending')?.count || 0;
    const approvedUsers = userStats.find(s => s._id === 'approved')?.count || 0;
    const rejectedUsers = userStats.find(s => s._id === 'rejected')?.count || 0;

    // Compter les dossiers et rapports
    const totalFolders = await db.collection("folders").countDocuments();
    const totalReports = await db.collection("reports").countDocuments();

    // Activité récente simulée (vous pouvez l'adapter selon vos besoins)
    const recentActivity = [
      {
        type: "user_registered",
        message: "Nouvel utilisateur inscrit",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 min ago
      },
      {
        type: "folder_created",
        message: "Nouveau dossier créé",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2h ago
      },
      {
        type: "report_created",
        message: "Nouveau rapport rédigé",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() // 4h ago
      }
    ];

    const stats = {
      totalUsers,
      pendingUsers,
      approvedUsers,
      rejectedUsers,
      totalFolders,
      totalReports,
      recentActivity
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error("Erreur chargement statistiques admin:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des statistiques" },
      { status: 500 }
    );
  }
}
