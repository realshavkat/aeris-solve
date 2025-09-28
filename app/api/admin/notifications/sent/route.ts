import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    const sentNotifications = await db.collection("sent_notifications")
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json(sentNotifications);

  } catch (error) {
    console.error("Erreur récupération notifications envoyées:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des notifications" },
      { status: 500 }
    );
  }
}
