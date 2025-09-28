import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { roleId } = await params;
    const body = await request.json();
    const { name, description, color, icon, isDefault, permissions } = body;

    const { db } = await connectToDatabase();

    // Vérifier si le rôle existe
    const existingRole = await db.collection("roles").findOne({ _id: new ObjectId(roleId) });
    if (!existingRole) {
      return NextResponse.json({ error: "Rôle non trouvé" }, { status: 404 });
    }

    // Vérifier si le nouveau nom existe déjà (sauf pour le rôle actuel)
    if (name && name !== existingRole.name) {
      const nameExists = await db.collection("roles").findOne({ 
        name: name.trim(),
        _id: { $ne: new ObjectId(roleId) }
      });
      if (nameExists) {
        return NextResponse.json(
          { error: "Un rôle avec ce nom existe déjà" },
          { status: 400 }
        );
      }
    }

    // Si c'est le nouveau rôle par défaut, retirer le flag des autres rôles
    if (isDefault && !existingRole.isDefault) {
      await db.collection("roles").updateMany(
        { _id: { $ne: new ObjectId(roleId) } },
        { $set: { isDefault: false } }
      );
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    };

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (permissions !== undefined) updateData.permissions = permissions;

    const result = await db.collection("roles").updateOne(
      { _id: new ObjectId(roleId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Rôle non trouvé" }, { status: 404 });
    }

    // Si on a changé le nom du rôle, mettre à jour les utilisateurs
    if (name && name !== existingRole.name) {
      await db.collection("users").updateMany(
        { role: existingRole.name },
        { $set: { role: name.trim() } }
      );
    }

    // Si les permissions ont changé, créer des notifications pour tous les utilisateurs ayant ce rôle
    if (permissions !== undefined) {
      const usersWithThisRole = await db.collection("users").find({
        role: name || existingRole.name
      }).toArray();

      // Créer des notifications de mise à jour pour chaque utilisateur
      if (usersWithThisRole.length > 0) {
        const updates = usersWithThisRole.map(user => ({
          userId: user._id.toString(),
          type: 'role_permissions_changed',
          roleName: name || existingRole.name,
          newPermissions: permissions,
          timestamp: new Date(),
          processed: false
        }));

        await db.collection("permission_updates").insertMany(updates);
      }

      // Mettre à jour les permissions des utilisateurs qui ont ce rôle
      await db.collection("users").updateMany(
        { role: name || existingRole.name },
        { $set: { permissions: permissions } }
      );
    }

    const updatedRole = await db.collection("roles").findOne({ _id: new ObjectId(roleId) });

    return NextResponse.json({
      ...updatedRole,
      permissionUpdateTriggered: permissions !== undefined
    });

  } catch (error) {
    console.error("Erreur modification rôle:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification du rôle" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Vérifier si le rôle existe
    const role = await db.collection("roles").findOne({ _id: new ObjectId(roleId) });
    if (!role) {
      return NextResponse.json({ error: "Rôle non trouvé" }, { status: 404 });
    }

    // Vérifier si des utilisateurs utilisent ce rôle
    const usersWithRole = await db.collection("users").countDocuments({ role: role.name });
    if (usersWithRole > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer ce rôle car ${usersWithRole} utilisateur(s) l'utilisent` },
        { status: 400 }
      );
    }

    // Supprimer le rôle
    const result = await db.collection("roles").deleteOne({ _id: new ObjectId(roleId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Rôle non trouvé" }, { status: 404 });
    }

    return NextResponse.json({ message: "Rôle supprimé avec succès" });

  } catch (error) {
    console.error("Erreur suppression rôle:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du rôle" },
      { status: 500 }
    );
  }
}