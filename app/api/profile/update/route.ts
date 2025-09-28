import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { rpName, anonymousNickname } = await request.json();
    if (!rpName?.trim() || !anonymousNickname?.trim()) {
      return NextResponse.json(
        { error: "Le nom RP et le surnom anonyme sont requis" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Mettre à jour l'utilisateur et récupérer l'ANCIEN doc pour comparaison
    const res = await db.collection("users").findOneAndUpdate(
      { _id: new ObjectId(session.user.id) },
      {
        $set: {
          rpName: rpName.trim(),
          anonymousNickname: anonymousNickname.trim(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: "before" }
    );

    if (!res || !res.value) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const oldUser = res.value as {
      discordId?: string;
      anonymousNickname?: string;
      nickname?: string;
      discordUsername?: string;
    };

    const oldName =
      oldUser.anonymousNickname || oldUser.nickname || oldUser.discordUsername || "";
    const newName = anonymousNickname.trim();

    // Si le nom a changé, propager les modifications
    let propagated = false;
    if (oldName !== newName) {
      // Dossiers où l'utilisateur est créateur
      await db.collection("folders").updateMany(
        { "creator.discordId": oldUser.discordId },
        { $set: { "creator.name": newName } }
      );

      // Rapports où l'utilisateur est auteur
      await db.collection("reports").updateMany(
        { "author.discordId": oldUser.discordId },
        { $set: { "author.name": newName } }
      );

      // Nom dans les membres des dossiers (arrayFilters)
      await db.collection("folders").updateMany(
        { "members.id": session.user.id },
        { $set: { "members.$[elem].name": newName } },
        { arrayFilters: [{ "elem.id": session.user.id }] }
      );

      propagated = true;
    }

    return NextResponse.json({
      message: propagated
        ? "Profil mis à jour et propagé dans vos contenus"
        : "Profil mis à jour avec succès",
      propagated,
    });
  } catch (error) {
    console.error("Erreur mise à jour profil:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du profil" },
      { status: 500 }
    );
  }
}
