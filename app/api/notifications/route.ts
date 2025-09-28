import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get("all") === "true";

    const { db } = await connectToDatabase();
    
    const query = { userId: session.user.id };
    const limit = showAll ? 0 : 50; // 0 = pas de limite si showAll = true
    
    const notifications = await db.collection("notifications")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json(notifications || []);
  } catch (error) {
    console.error("Erreur chargement notifications:", error);
    return NextResponse.json([]);
  }
}

