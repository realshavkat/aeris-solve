import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { userId } = await params;
    const { role } = await request.json();
    
    if (!role) {
      return NextResponse.json({ error: "Rôle requis" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Vérifier que le rôle existe
    const roleExists = await db.collection("roles").findOne({ slug: role });
    if (!roleExists) {
      return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
    }

    // Vérifier que l'utilisateur existe
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Empêcher de modifier son propre rôle
    if (userId === session.user.id) {
      return NextResponse.json({ 
        error: "Vous ne pouvez pas modifier votre propre rôle" 
      }, { status: 400 });
    }

    // Mettre à jour le rôle de l'utilisateur
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          role: role,
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Récupérer l'utilisateur mis à jour
    const updatedUser = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          password: 0 // Exclure le mot de passe des résultats
        }
      }
    );

    return NextResponse.json(updatedUser);

  } catch (error) {
    console.error("Erreur modification rôle utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification du rôle" },
      { status: 500 }
    );
  }
}
