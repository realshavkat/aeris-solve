import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { ObjectId } from "mongodb";
import { discordLogger } from "@/lib/discord-logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    
    // Validation de l'ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID de rapport invalide" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    const report = await db.collection("reports").findOne({
      _id: new ObjectId(id)
    });

    if (!report) {
      return NextResponse.json({ error: "Rapport non trouvé" }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Erreur récupération rapport:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    
    // Validation de l'ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID de rapport invalide" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Récupérer l'utilisateur et le rapport
    const [user, report] = await Promise.all([
      db.collection("users").findOne({ _id: new ObjectId(session.user.id) }),
      db.collection("reports").findOne({ _id: new ObjectId(id) })
    ]);

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    if (!report) {
      return NextResponse.json({ error: "Rapport non trouvé" }, { status: 404 });
    }

    // MODIFICATION: Vérifier si l'utilisateur a accès au dossier au lieu de vérifier seulement l'auteur
    const folder = await db.collection("folders").findOne({
      _id: new ObjectId(report.folderId)
    });

    if (!folder) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    // Vérifier que l'utilisateur est soit propriétaire du dossier, soit membre du dossier
    const hasAccess = folder.ownerId === session.user.id || 
                      folder.members?.some((member: Record<string, unknown>) => member.id === session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Non autorisé à modifier ce rapport" }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, importance, tags, color, icon } = body;

    // Validation des données
    if (!title?.trim()) {
      return NextResponse.json({ error: "Le titre est requis" }, { status: 400 });
    }

    if (!content?.trim()) {
      return NextResponse.json({ error: "Le contenu est requis" }, { status: 400 });
    }

    // Détecter les changements
    const changes: Record<string, { old: Record<string, unknown>; new: Record<string, unknown> }> = {};
    
    if (title !== undefined && title !== report.title) {
      changes.title = { old: report.title, new: title };
    }
    if (content !== undefined && content !== report.content) {
      changes.content = { old: report.content, new: content };
    }
    if (importance !== undefined && importance !== report.importance) {
      changes.importance = { old: report.importance, new: importance };
    }
    if (tags !== undefined && JSON.stringify(tags) !== JSON.stringify(report.tags || [])) {
      changes.tags = { old: report.tags || [], new: tags };
    }
    if (color !== undefined && color !== report.color) {
      changes.color = { old: report.color, new: color };
    }
    if (icon !== undefined && icon !== report.icon) {
      changes.icon = { old: report.icon, new: icon };
    }

    // Préparer les données de mise à jour
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      // AJOUT: Mettre à jour les infos de l'éditeur si ce n'est pas l'auteur original
      lastEditedBy: {
        id: user._id.toString(),
        name: user.anonymousNickname || user.discordUsername || "Utilisateur",
        discordId: user.discordId,
        editedAt: new Date()
      }
    };

    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (importance !== undefined) updateData.importance = importance;
    if (tags !== undefined) updateData.tags = tags || [];
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;

    const result = await db.collection("reports").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (!result.matchedCount) {
      return NextResponse.json({ error: "Rapport non trouvé" }, { status: 404 });
    }

    const updatedReport = await db.collection("reports").findOne({
      _id: new ObjectId(id)
    });

    if (!updatedReport) {
      return NextResponse.json({ error: "Erreur lors de la récupération du rapport mis à jour" }, { status: 500 });
    }

    // Log Discord seulement s'il y a des changements
    if (Object.keys(changes).length > 0) {
      try {
        await discordLogger.logReportUpdated(
          {
            name: user.anonymousNickname || user.discordUsername || "Utilisateur",
            discordId: user.discordId
          },
          {
            title: updatedReport.title,
            _id: updatedReport._id.toString()
          },
          changes,
          {
            title: folder.title
          }
        );
      } catch (logError) {
        console.error("Erreur log Discord:", logError);
        // Ne pas faire échouer la mise à jour si le log échoue
      }
    }

    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error("Erreur mise à jour rapport:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du rapport" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    
    // Validation de l'ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID de rapport invalide" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Récupérer l'utilisateur et le rapport
    const [user, report] = await Promise.all([
      db.collection("users").findOne({ _id: new ObjectId(session.user.id) }),
      db.collection("reports").findOne({ _id: new ObjectId(id) })
    ]);

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    if (!report) {
      return NextResponse.json({ error: "Rapport non trouvé" }, { status: 404 });
    }

    // MODIFICATION: Même logique pour la suppression - vérifier l'accès au dossier
    const folder = await db.collection("folders").findOne({
      _id: new ObjectId(report.folderId)
    });

    if (!folder) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    // Vérifier que l'utilisateur est soit propriétaire du dossier, soit membre du dossier
    const hasAccess = folder.ownerId === session.user.id || 
                      folder.members?.some((member: Record<string, unknown>) => member.id === session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Non autorisé à supprimer ce rapport" }, { status: 403 });
    }

    const result = await db.collection("reports").deleteOne({
      _id: new ObjectId(id)
    });

    if (!result.deletedCount) {
      return NextResponse.json({ error: "Rapport non trouvé" }, { status: 404 });
    }

    // Log Discord
    try {
      await discordLogger.logReportDeleted(
        {
          name: user.anonymousNickname || user.discordUsername || "Utilisateur",
          discordId: user.discordId
        },
        {
          title: report.title,
          _id: report._id.toString()
        },
        {
          title: folder.title
        }
      );
    } catch (logError) {
      console.error("Erreur log Discord:", logError);
      // Ne pas faire échouer la suppression si le log échoue
    }

    return NextResponse.json({ message: "Rapport supprimé avec succès" });
  } catch (error) {
    console.error("Erreur suppression rapport:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du rapport" },
      { status: 500 }
    );
  }
}