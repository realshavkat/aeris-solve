import { NextRequest, NextResponse } from "next/server";
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