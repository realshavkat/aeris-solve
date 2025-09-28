import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { userId } = await params;
    const body = await request.json();
    const { action, role, rpName, anonymousNickname, status } = body;

    const { db } = await connectToDatabase();

    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    };

    switch (action) {
      case 'approve':
        updateData.status = 'approved';
        updateData.role = role || 'member';
        break;
      case 'reject':
        updateData.status = 'rejected';
        break;
      case 'ban':
        updateData.status = 'banned';
        // Créer une notification de déconnexion forcée pour l'utilisateur banni
        await db.collection("permission_updates").insertOne({
          userId: userId,
          type: 'user_banned',
          timestamp: new Date(),
          processed: false
        });
        break;
      case 'unban':
        updateData.status = 'approved';
        updateData.role = role || 'member';
        break;
      case 'update':
        // Modification complète des données utilisateur
        if (rpName !== undefined) updateData.rpName = rpName;
        if (anonymousNickname !== undefined) updateData.anonymousNickname = anonymousNickname;
        if (role !== undefined) {
          updateData.role = role;
          
          // Si on assigne un rôle personnalisé, récupérer ses permissions
          if (!['visitor', 'member', 'admin'].includes(role)) {
            const customRole = await db.collection("roles").findOne({ name: role });
            if (customRole && customRole.permissions) {
              updateData.permissions = customRole.permissions;
            }
          } else {
            // Supprimer les permissions personnalisées pour les rôles par défaut
            updateData.$unset = { permissions: "" };
          }
        }
        if (status !== undefined) updateData.status = status;
        break;
      default:
        return NextResponse.json({ error: "Action non valide" }, { status: 400 });
    }

    // Construire la requête de mise à jour
    const updateOperation: Record<string, unknown> = { $set: updateData };
    if (updateData.$unset) {
      updateOperation.$unset = updateData.$unset;
      delete updateData.$unset;
    }

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      updateOperation
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Si le rôle ou les permissions ont changé, créer une notification de mise à jour
    if (action === 'update' && (role !== undefined)) {
      await db.collection("permission_updates").insertOne({
        userId: userId,
        type: 'user_role_changed',
        newRole: role,
        timestamp: new Date(),
        processed: false
      });
    }

    // Propagation des changements de nom dans les dossiers et rapports
    if (action === 'update' && (rpName !== undefined || anonymousNickname !== undefined)) {
      const updatedUser = await db.collection("users").findOne({ _id: new ObjectId(userId) });
      
      if (updatedUser) {
        const newCreatorName = updatedUser.anonymousNickname || updatedUser.discordUsername || "Utilisateur";
        
        try {
          await db.collection("folders").updateMany(
            { ownerId: userId },
            { 
              $set: { 
                "creator.name": newCreatorName,
                lastModified: new Date()
              }
            }
          );

          await db.collection("reports").updateMany(
            { authorId: userId },
            { 
              $set: { 
                "author.name": newCreatorName,
                lastModified: new Date()
              }
            }
          );
        } catch (propagationError) {
          console.error("Erreur propagation changements:", propagationError);
        }
      }
    }

    return NextResponse.json({ 
      message: "Action effectuée avec succès",
      propagated: action === 'update' && (rpName !== undefined || anonymousNickname !== undefined),
      permissionUpdateTriggered: action === 'update' && (role !== undefined),
      userDisconnected: action === 'ban'
    });

  } catch (error) {
    console.error("Erreur action utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'action sur l'utilisateur" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { userId } = await params;
    const { db } = await connectToDatabase();

    // Créer une notification de déconnexion forcée avant suppression
    await db.collection("permission_updates").insertOne({
      userId: userId,
      type: 'user_deleted',
      timestamp: new Date(),
      processed: false
    });

    const result = await db.collection("users").deleteOne({
      _id: new ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    return NextResponse.json({ 
      message: "Utilisateur supprimé avec succès",
      userDisconnected: true 
    });
  } catch (error) {
    console.error("Erreur suppression utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'utilisateur" },
      { status: 500 }
    );
  }
}
