import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    const users = await db.collection("users")
      .find({})
      .project({
        _id: 1,
        discordId: 1,
        discordUsername: 1,
        anonymousNickname: 1,
        rpName: 1,
        role: 1,
        status: 1,
        avatar: 1,
        createdAt: 1
      })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(users);

  } catch (error) {
    console.error("Erreur récupération utilisateurs:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des utilisateurs" },
      { status: 500 }
    );
  }
}