import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { folderId } = await params;
    const body = await request.json();
    const { db } = await connectToDatabase();

    // Vérifier que le dossier existe
    const existingFolder = await db.collection("folders").findOne({ _id: new ObjectId(folderId) });
    if (!existingFolder) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      lastModified: new Date()
    };

    // Mise à jour des champs modifiés
    if (body.title !== undefined) {
      updateData.title = body.title.trim();
    }
    if (body.description !== undefined) {
      updateData.description = body.description.trim();
    }
    if (body.coverImage !== undefined) {
      if (body.coverImage === null || body.coverImage === '') {
        updateData.$unset = { coverImage: "" };
      } else {
        updateData.coverImage = body.coverImage;
      }
    }
    if (body.accessKey !== undefined) {
      if (body.accessKey === null || body.accessKey === '') {
        updateData.$unset = { ...(updateData.$unset ?? {}), accessKey: "" };
      } else {
        updateData.$set = { ...(updateData.$set ?? {}), accessKey: body.accessKey };
      }
    }
    if (body.ownerId !== undefined) {
      // Récupérer les informations du nouveau propriétaire
      const newOwner = await db.collection("users").findOne({ _id: new ObjectId(body.ownerId) });
      if (newOwner) {
        updateData.ownerId = body.ownerId;
        updateData.creator = {
          name: newOwner.anonymousNickname || newOwner.discordUsername || "Utilisateur",
          discordId: newOwner.discordId
        };

        // Mettre à jour la liste des membres si le nouveau propriétaire n'y est pas
        const members = existingFolder.members || [];
        const isOwnerInMembers = members.some((member: Record<string, unknown>) => member.id === body.ownerId);
        
        if (!isOwnerInMembers) {
          const newMember = {
            id: body.ownerId,
            name: newOwner.anonymousNickname || newOwner.discordUsername || "Utilisateur",
            image: newOwner.avatar ? `https://cdn.discordapp.com/avatars/${newOwner.discordId}/${newOwner.avatar}.png` : null
          };
          updateData.members = [...members, newMember];
        }
      }
    }

    const updateOperation: Record<string, unknown> = { $set: updateData };
    if (updateData.$unset) {
      updateOperation.$unset = updateData.$unset;
      delete updateData.$unset;
    }

    await db.collection("folders").updateOne(
      { _id: new ObjectId(folderId) },
      updateOperation
    );

    // Récupérer le dossier mis à jour avec les statistiques
    const updatedFolder = await db.collection("folders").aggregate([
      { $match: { _id: new ObjectId(folderId) } },
      {
        $lookup: {
          from: "reports",
          localField: "_id",
          foreignField: "folderId",
          as: "reports"
        }
      },
      {
        $addFields: {
          reportsCount: { $size: "$reports" },
          membersCount: { $size: { $ifNull: ["$members", []] } }
        }
      },
      {
        $project: {
          reports: 0
        }
      }
    ]).toArray();

    return NextResponse.json(updatedFolder[0]);

  } catch (error) {
    console.error("Erreur modification dossier admin:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification du dossier" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { folderId } = await params;
    const { db } = await connectToDatabase();

    // Vérifier que le dossier existe
    const folder = await db.collection("folders").findOne({ _id: new ObjectId(folderId) });
    if (!folder) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    // Supprimer tous les rapports associés
    await db.collection("reports").deleteMany({ folderId: folderId });

    // Supprimer tous les brouillons associés
    await db.collection("drafts").deleteMany({ folderId: folderId });

    // Supprimer le dossier
    await db.collection("folders").deleteOne({ _id: new ObjectId(folderId) });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur suppression dossier admin:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du dossier" },
      { status: 500 }
    );
  }
}
