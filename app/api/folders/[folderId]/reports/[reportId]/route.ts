import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string; reportId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { folderId, reportId } = await params;
    const { db } = await connectToDatabase();
    
    const report = await db.collection("reports").findOne({
      _id: new ObjectId(reportId),
      folderId: folderId
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
  { params }: { params: Promise<{ folderId: string; reportId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { folderId, reportId } = await params;
    const { db } = await connectToDatabase();
    
    const report = await db.collection("reports").findOne({
      _id: new ObjectId(reportId),
      folderId: folderId
    });

    if (!report) {
      return NextResponse.json({ error: "Rapport non trouvé" }, { status: 404 });
    }

    if (report.authorId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé à modifier ce rapport" }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, importance, tags, color, icon } = body;

    const result = await db.collection("reports").updateOne(
      { _id: new ObjectId(reportId), folderId: folderId },
      {
        $set: {
          title,
          content,
          importance,
          tags,
          color,
          icon,
          updatedAt: new Date()
        }
      }
    );

    if (!result.matchedCount) {
      return NextResponse.json({ error: "Rapport non trouvé" }, { status: 404 });
    }

    const updatedReport = await db.collection("reports").findOne({
      _id: new ObjectId(reportId)
    });

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
  { params }: { params: Promise<{ folderId: string; reportId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { folderId, reportId } = await params;
    const { db } = await connectToDatabase();
    
    const report = await db.collection("reports").findOne({
      _id: new ObjectId(reportId),
      folderId: folderId
    });

    if (!report) {
      return NextResponse.json({ error: "Rapport non trouvé" }, { status: 404 });
    }

    if (report.authorId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé à supprimer ce rapport" }, { status: 403 });
    }

    const result = await db.collection("reports").deleteOne({
      _id: new ObjectId(reportId),
      folderId: folderId
    });

    if (!result.deletedCount) {
      return NextResponse.json({ error: "Rapport non trouvé" }, { status: 404 });
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
