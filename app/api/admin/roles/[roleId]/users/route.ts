import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { roleId } = await params;
    const { db } = await connectToDatabase();

    // Récupérer le rôle
    const role = await db.collection("roles").findOne({ _id: new ObjectId(roleId) });
    if (!role) {
      return NextResponse.json({ error: "Rôle non trouvé" }, { status: 404 });
    }

    // Récupérer les utilisateurs avec ce rôle
    const users = await db.collection("users")
      .find({ role: role.name })
      .project({
        discordUsername: 1,
        discordDiscriminator: 1,
        anonymousNickname: 1,
        rpName: 1,
        avatar: 1,
        discordId: 1,
        status: 1,
        createdAt: 1
      })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      role,
      users
    });

  } catch (error) {
    console.error("Erreur chargement utilisateurs du rôle:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des utilisateurs" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { roleId } = await params;
    const { userIds } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "Liste d'utilisateurs requise" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Récupérer le rôle
    const role = await db.collection("roles").findOne({ _id: new ObjectId(roleId) });
    if (!role) {
      return NextResponse.json({ error: "Rôle non trouvé" }, { status: 404 });
    }

    // Mettre à jour les utilisateurs
    const result = await db.collection("users").updateMany(
      { _id: { $in: userIds.map(id => new ObjectId(id)) } },
      { $set: { role: role.name, updatedAt: new Date() } }
    );

    return NextResponse.json({
      message: `${result.modifiedCount} utilisateur(s) mis à jour avec le rôle ${role.name}`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error("Erreur attribution rôle:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'attribution du rôle" },
      { status: 500 }
    );
  }
}
