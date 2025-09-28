import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Utiliser MongoDB directement au lieu de Mongoose
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(session.user.id) },
      {
        projection: {
          _id: 1,
          discordId: 1,
          discordUsername: 1,
          discordDiscriminator: 1,
          avatar: 1,
          rpName: 1,
          anonymousNickname: 1,
          nickname: 1,
          role: 1,
          status: 1,
          email: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    );

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Transformer les données pour correspondre à l'interface attendue
    const userData = {
      id: user._id.toString(),
      name: user.nickname || user.discordUsername,
      email: user.email || null,
      image: user.avatar ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` : null,
      rpName: user.rpName || null,
      anonymousNickname: user.anonymousNickname || null,
      discordUsername: user.discordDiscriminator && user.discordDiscriminator !== '0' 
        ? `${user.discordUsername}#${user.discordDiscriminator}` 
        : user.discordUsername,
      role: user.role || "visitor",
      status: user.status || "needs_registration"
    };

    return NextResponse.json(userData);

  } catch (error) {
    console.error("Error in user-data route:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}