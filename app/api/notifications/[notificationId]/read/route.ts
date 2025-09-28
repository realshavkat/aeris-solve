import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { notificationId } = await params;

    if (!ObjectId.isValid(notificationId)) {
      return NextResponse.json(
        { error: "ID de notification invalide" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Vérifier que la notification existe et appartient à l'utilisateur
    const notification = await db.collection("notifications").findOne({
      _id: new ObjectId(notificationId),
      userId: session.user.id,
    });

    if (!notification) {
      return NextResponse.json({ error: "Notification non trouvée" }, { status: 404 });
    }

    // Marquer comme lue
    const result = await db.collection("notifications").updateOne(
      {
        _id: new ObjectId(notificationId),
        userId: session.user.id,
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Aucune modification effectuée" },
        { status: 400 }
      );
    }

    console.log(
      `✅ Notification ${notificationId} marquée comme lue pour l'utilisateur ${session.user.id}`
    );

    return NextResponse.json({
      success: true,
      message: "Notification marquée comme lue",
    });
  } catch (error) {
    console.error("❌ Erreur marquage notification:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
