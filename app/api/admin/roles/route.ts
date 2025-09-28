import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    const roles = await db.collection("roles").find({}).sort({ createdAt: -1 }).toArray();

    // Ajouter le nombre d'utilisateurs pour chaque rôle
    const rolesWithUserCounts = await Promise.all(
      roles.map(async (role) => {
        const userCount = await db.collection("users").countDocuments({ role: role.name });
        return {
          ...role,
          userCount
        };
      })
    );

    return NextResponse.json(rolesWithUserCounts);

  } catch (error) {
    console.error("Erreur chargement rôles:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des rôles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, color, icon, isDefault, permissions } = body;

    if (!name?.trim() || !description?.trim()) {
      return NextResponse.json(
        { error: "Le nom et la description sont requis" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Vérifier si le nom du rôle existe déjà
    const existingRole = await db.collection("roles").findOne({ name: name.trim() });
    if (existingRole) {
      return NextResponse.json(
        { error: "Un rôle avec ce nom existe déjà" },
        { status: 400 }
      );
    }

    // Si c'est le rôle par défaut, retirer le flag des autres rôles
    if (isDefault) {
      await db.collection("roles").updateMany(
        { isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const newRole = {
      name: name.trim(),
      description: description.trim(),
      color: color || '#6b7280',
      icon: icon || '👤',
      isDefault: isDefault || false,
      permissions: permissions || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection("roles").insertOne(newRole);

    const createdRole = await db.collection("roles").findOne({ _id: result.insertedId });

    return NextResponse.json(createdRole);

  } catch (error) {
    console.error("Erreur création rôle:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du rôle" },
      { status: 500 }
    );
  }
}

// Fonction pour s'assurer que les rôles par défaut existent SANS CRÉER DE DOUBLONS
async function ensureDefaultRoles(db: any) {
  // Supprimer d'abord tous les doublons potentiels
  const rolesSlugs = ['visitor', 'member', 'admin'];
  
  for (const slug of rolesSlugs) {
    const existingRoles = await db.collection("roles").find({ slug }).toArray();
    
    if (existingRoles.length > 1) {
      // Garder le premier, supprimer les autres
      const rolesToDelete = existingRoles.slice(1);
      for (const role of rolesToDelete) {
        await db.collection("roles").deleteOne({ _id: role._id });
      }
    }
  }

  const defaultRoles = [
    {
      name: "Visiteur",
      slug: "visitor",
      description: "Rôle par défaut pour les nouveaux utilisateurs en attente d'approbation",
      color: "#6b7280",
      permissions: ["view_profile"],
      isDefault: false,
      isSystem: true
    },
    {
      name: "Membre",
      slug: "member",
      description: "Utilisateur approuvé avec accès complet aux fonctionnalités de base",
      color: "#3b82f6",
      permissions: [
        "view_dashboard", "view_profile", "edit_profile",
        "create_folder", "edit_own_folders", "delete_own_folders", "join_folders", "manage_folder_members",
        "create_reports", "edit_own_reports", "delete_own_reports"
      ],
      isDefault: true,
      isSystem: true
    },
    {
      name: "Administrateur",
      slug: "admin",
      description: "Accès complet à toutes les fonctionnalités d'administration",
      color: "#ef4444",
      permissions: [
        "view_dashboard", "view_profile", "edit_profile",
        "create_folder", "edit_own_folders", "delete_own_folders", "join_folders", "manage_folder_members",
        "create_reports", "edit_own_reports", "delete_own_reports", "view_all_reports",
        "admin_panel", "manage_users", "manage_roles", "send_notifications", "view_analytics"
      ],
      isDefault: false,
      isSystem: true
    }
  ];

  for (const role of defaultRoles) {
    const existing = await db.collection("roles").findOne({ slug: role.slug });
    if (!existing) {
      await db.collection("roles").insertOne({
        ...role,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }
}
