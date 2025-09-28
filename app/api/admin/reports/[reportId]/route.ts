import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { reportId } = await params;
    const { db } = await connectToDatabase();

    // Vérifier que le rapport existe
    const report = await db.collection("reports").findOne({ _id: new ObjectId(reportId) });
    if (!report) {
      return NextResponse.json({ error: "Rapport non trouvé" }, { status: 404 });
    }

    // Supprimer le rapport
    await db.collection("reports").deleteOne({ _id: new ObjectId(reportId) });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur suppression rapport admin:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du rapport" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { reportId } = await params;
    const body = await request.json();
    const { db } = await connectToDatabase();

    // Vérifier que le rapport existe
    const existingReport = await db.collection("reports").findOne({ _id: new ObjectId(reportId) });
    if (!existingReport) {
      return NextResponse.json({ error: "Rapport non trouvé" }, { status: 404 });
    }

    const updateData: any = {
      lastModified: new Date()
    };

    // Mise à jour des champs modifiés
    if (body.title !== undefined) {
      updateData.title = body.title.trim();
    }
    if (body.content !== undefined) {
      updateData.content = body.content;
    }
    if (body.importance !== undefined) {
      updateData.importance = body.importance;
    }
    if (body.tags !== undefined) {
      updateData.tags = body.tags;
    }
    if (body.color !== undefined) {
      updateData.color = body.color;
    }
    if (body.icon !== undefined) {
      updateData.icon = body.icon;
    }

    await db.collection("reports").updateOne(
      { _id: new ObjectId(reportId) },
      { $set: updateData }
    );

    // Récupérer le rapport mis à jour
    const updatedReport = await db.collection("reports").findOne({ _id: new ObjectId(reportId) });

    return NextResponse.json(updatedReport);

  } catch (error) {
    console.error("Erreur modification rapport admin:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification du rapport" },
      { status: 500 }
    );
  }
}
