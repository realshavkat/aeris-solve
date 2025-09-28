import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PATCH(request: NextRequest) {
  try {
    const folderId = request.nextUrl.searchParams.get('id');
    if (!folderId) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    const body = await request.json();
    const { db } = await connectToDatabase();
    
    const objectId = new ObjectId(folderId);
    const result = await db.collection("folders").updateOne(
      { _id: objectId },
      { $set: { ...body, lastModified: new Date() } }
    );

    if (!result.matchedCount) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }

    const updatedFolder = await db.collection("folders").findOne({ _id: objectId });
    return NextResponse.json(updatedFolder);
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
