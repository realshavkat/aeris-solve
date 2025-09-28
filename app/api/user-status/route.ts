// Fichier: app/api/user-status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { status: 1, role: 1 } }
    );

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    return NextResponse.json({
      status: user.status,
      role: user.role
    });

  } catch (error) {
    console.error("Erreur vérification statut:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}