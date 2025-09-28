import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { ObjectId } from "mongodb";
import { discordLogger } from "@/lib/discord-logger"; // AJOUT

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Récupérer seulement les dossiers où l'utilisateur est propriétaire OU membre
    const folders = await db.collection("folders")
      .find({
        $or: [
          { ownerId: session.user.id }, // Dossiers créés par l'utilisateur
          { "members.id": session.user.id } // Dossiers où l'utilisateur est membre
        ]
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Pour chaque dossier, compter les rapports
    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
        const reportsCount = await db.collection("reports").countDocuments({
          folderId: folder._id.toString()
        });
        
        return {
          ...folder,
          reportsCount
        };
      })
    );

    return NextResponse.json(foldersWithCounts);
  } catch (error) {
    console.error("Erreur chargement dossiers:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des dossiers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    const user = await db.collection("users").findOne({
      _id: new ObjectId(session.user.id)
    });
    
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    
    const newFolder = {
      ...body,
      createdAt: new Date(),
      lastModified: new Date(),
      reportsCount: 0,
      creator: {
        name: user.anonymousNickname || user.discordUsername || "Utilisateur",
        discordId: user.discordId
      },
      ownerId: user._id.toString(),
      // Ajouter automatiquement le créateur en tant que membre
      members: [{
        id: user._id.toString(),
        name: user.anonymousNickname || user.discordUsername || "Utilisateur",
        image: user.avatar ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` : null
      }]
    };

    const result = await db.collection("folders").insertOne(newFolder);
    
    if (!result.insertedId) {
      throw new Error("Erreur lors de la création du dossier");
    }

    const createdFolder = await db.collection("folders").findOne({ 
      _id: result.insertedId 
    });

    // AJOUT: Log Discord
    try {
      await discordLogger.logFolderCreated(
        {
          name: user.anonymousNickname || user.discordUsername || "Utilisateur",
          discordId: user.discordId
        },
        {
          title: createdFolder.title,
          description: createdFolder.description,
          _id: createdFolder._id.toString()
        }
      );
    } catch (logError) {
      console.error("Erreur log Discord:", logError);
      // Ne pas faire échouer la création du dossier si le log échoue
    }

    return NextResponse.json(createdFolder);
  } catch (error) {
    console.error("Erreur création dossier:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du dossier" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { db } = await connectToDatabase();

    const objectId = new ObjectId(id);
    
    // Récupérer l'utilisateur et le dossier actuel
    const [user, folder] = await Promise.all([
      db.collection("users").findOne({ _id: new ObjectId(session.user.id) }),
      db.collection("folders").findOne({ _id: objectId })
    ]);

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    if (!folder) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    if (folder.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Vous n'êtes pas autorisé à modifier ce dossier" }, { status: 403 });
    }

    // AJOUT: Détecter les changements
    const changes: Record<string, { old: Record<string, unknown>; new: Record<string, unknown> }> = {};
    
    if (body.title !== undefined && body.title !== folder.title) {
      changes.title = { old: folder.title, new: body.title };
    }
    if (body.description !== undefined && body.description !== folder.description) {
      changes.description = { old: folder.description, new: body.description };
    }
    if (body.coverImage !== undefined && body.coverImage !== folder.coverImage) {
      changes.coverImage = { old: folder.coverImage, new: body.coverImage };
    }

    // Préparer les données à mettre à jour
    const updateData: Record<string, unknown> = {
      lastModified: new Date(),
    };

    if (body.title !== undefined) {
      updateData.title = body.title?.trim();
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim();
    }
    if (body.coverImage !== undefined) {
      if (body.coverImage === null) {
        updateData.$unset = { coverImage: "" };
      } else {
        updateData.coverImage = body.coverImage;
      }
    }

    const updateOperation: Record<string, unknown> = { $set: updateData };
    if (updateData.$unset) {
      updateOperation.$unset = updateData.$unset;
      delete updateData.$unset;
    }

    const result = await db.collection("folders").updateOne(
      { _id: objectId },
      updateOperation
    );

    if (!result.matchedCount) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    const updatedFolder = await db.collection("folders").findOne({ _id: objectId });
    if (!updatedFolder) {
      return NextResponse.json({ error: "Erreur lors de la récupération du dossier mis à jour" }, { status: 500 });
    }

    // AJOUT: Log Discord seulement s'il y a des changements
    if (Object.keys(changes).length > 0) {
      try {
        await discordLogger.logFolderUpdated(
          {
            name: user.anonymousNickname || user.discordUsername || "Utilisateur",
            discordId: user.discordId
          },
          {
            title: updatedFolder.title,
            _id: updatedFolder._id.toString()
          },
          changes
        );
      } catch (logError) {
        console.error("Erreur log Discord:", logError);
      }
    }

    return NextResponse.json(updatedFolder);
  } catch (error) {
    console.error("Erreur modification dossier:", error);
    return NextResponse.json({ error: "Erreur lors de la modification du dossier" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Récupérer l'utilisateur et le dossier
    const [user, folder] = await Promise.all([
      db.collection("users").findOne({ _id: new ObjectId(session.user.id) }),
      db.collection("folders").findOne({ _id: new ObjectId(id) })
    ]);

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    if (!folder) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    if (folder.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Vous n'êtes pas autorisé à supprimer ce dossier" }, { status: 403 });
    }

    // AJOUT: Compter les rapports qui vont être supprimés
    const reportsCount = await db.collection("reports").countDocuments({
      folderId: id
    });

    // Supprimer les rapports associés
    if (reportsCount > 0) {
      await db.collection("reports").deleteMany({ folderId: id });
    }

    const result = await db.collection("folders").deleteOne({
      _id: new ObjectId(id),
    });

    if (!result.deletedCount) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    // AJOUT: Log Discord
    try {
      await discordLogger.logFolderDeleted(
        {
          name: user.anonymousNickname || user.discordUsername || "Utilisateur",
          discordId: user.discordId
        },
        {
          title: folder.title,
          _id: folder._id.toString(),
          reportsCount
        }
      );
    } catch (logError) {
      console.error("Erreur log Discord:", logError);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erreur suppression dossier:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression du dossier" }, { status: 500 });
  }
}
