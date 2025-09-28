import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Cache côté serveur OPTIMISÉ
const serverCache = new Map<string, { permissions: any; timestamp: number }>();
const SERVER_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000; // Limite de la taille du cache

// Nettoyage périodique du cache
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of serverCache.entries()) {
    if (now - value.timestamp > SERVER_CACHE_DURATION) {
      serverCache.delete(key);
    }
  }
  
  // Si le cache est trop gros, supprimer les plus anciens
  if (serverCache.size > MAX_CACHE_SIZE) {
    const sortedEntries = Array.from(serverCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toDelete = sortedEntries.slice(0, serverCache.size - MAX_CACHE_SIZE);
    toDelete.forEach(([key]) => serverCache.delete(key));
  }
}, 10 * 60 * 1000); // Nettoyage toutes les 10 minutes

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    const now = Date.now();
    
    // Vérifier le cache serveur
    const cached = serverCache.get(userId);
    if (cached && (now - cached.timestamp < SERVER_CACHE_DURATION)) {
      console.log('🎯 Permissions servies depuis le cache serveur');
      return NextResponse.json(cached.permissions);
    }

    console.log('🔄 Calcul des permissions serveur pour:', userId);
    const { db } = await connectToDatabase();
    
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { role: 1, permissions: 1, status: 1 } }
    );

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Permissions par défaut selon le rôle
    const defaultPermissions = {
      visitor: {
        viewDashboard: false,
        createFolders: false,
        editOwnFolders: false,
        editAllFolders: false,
        deleteOwnFolders: false,
        deleteAllFolders: false,
        createReports: false,
        editOwnReports: false,
        editAllReports: false,
        deleteOwnReports: false,
        deleteAllReports: false,
        joinFolders: false,
        manageProfile: false,
      },
      member: {
        viewDashboard: true,
        createFolders: true,
        editOwnFolders: true,
        editAllFolders: false,
        deleteOwnFolders: true,
        deleteAllFolders: false,
        createReports: true,
        editOwnReports: true,
        editAllReports: false,
        deleteOwnReports: true,
        deleteAllReports: false,
        joinFolders: true,
        manageProfile: true,
      },
      admin: {
        viewDashboard: true,
        createFolders: true,
        editOwnFolders: true,
        editAllFolders: true,
        deleteOwnFolders: true,
        deleteAllFolders: true,
        createReports: true,
        editOwnReports: true,
        editAllReports: true,
        deleteOwnReports: true,
        deleteAllReports: true,
        joinFolders: true,
        manageProfile: true,
      }
    };

    const userRole = user.role || 'visitor';
    let permissions = defaultPermissions[userRole as keyof typeof defaultPermissions] || defaultPermissions.visitor;

    // Si l'utilisateur a des permissions personnalisées (rôles personnalisés)
    if (user.permissions && typeof user.permissions === 'object') {
      permissions = { ...permissions, ...user.permissions };
    }

    // Si le statut n'est pas approuvé, limiter les permissions
    if (user.status !== 'approved') {
      permissions = defaultPermissions.visitor;
    }

    // Mettre en cache côté serveur
    serverCache.set(userId, {
      permissions,
      timestamp: now
    });

    console.log('✅ Permissions calculées et mises en cache');
    
    const response = NextResponse.json(permissions);
    
    // Headers de cache optimisés
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=60');
    
    return response;

  } catch (error) {
    console.error("Erreur récupération permissions:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

