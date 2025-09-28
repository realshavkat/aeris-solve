import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { userId } = await params;
    const { db } = await connectToDatabase();

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          discordId: 1,
          discordUsername: 1,
          discordDiscriminator: 1,
          avatar: 1,
          rpName: 1,
          anonymousNickname: 1,
          status: 1,
          role: 1,
          createdAt: 1,
          updatedAt: 1,
          lastActivity: 1
        }
      }
    );

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    return NextResponse.json(user);

  } catch (error) {
    console.error("Erreur chargement détails utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des détails" },
      { status: 500 }
    );
  }
}
