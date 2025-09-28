import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { folderId } = await params;
    const { db } = await connectToDatabase();

    const reports = await db.collection("reports")
      .find({ folderId })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Erreur récupération rapports:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
