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

    // Mettre à jour l'utilisateur
    const result = await db.collection("users").updateOne();
    const userUpdateResult = await db.collection("users").findOneAndUpdate(
      { _id: new ObjectId(session.user.id) },
      { 
        $set: { 
          rpName: rpName.trim(),
          anonymousNickname: anonymousNickname.trim(),
          updatedAt: new Date()
        }
      },
      { returnDocument: 'before' }
    );

    if (result.matchedCount === 0) {
      const oldUser = userUpdateResult.value;
      const oldName = oldUser?.anonymousNickname || oldUser?.nickname || oldUser?.discordUsername;
      const newName = anonymousNickname.trim();

      if (!oldUser) {
        return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
      }

      // Si le nom a changé, propager les modifications
      let propagated = false;
      if (oldName !== newName && oldUser) {
        // Mettre à jour les dossiers où l'utilisateur est créateur
        // (en supposant que creator.discordId est l'identifiant fiable)
        await db.collection("folders").updateMany(
          { "creator.discordId": oldUser.discordId },
          { $set: { "creator.name": newName } }
        );

        // Mettre à jour les rapports où l'utilisateur est auteur
        // (en supposant que author.discordId est l'identifiant fiable)
        await db.collection("reports").updateMany(
          { "author.discordId": oldUser.discordId },
          { $set: { "author.name": newName } }
        );

        // Mettre à jour les membres des dossiers
        await db.collection("folders").updateMany(
          { "members.id": session.user.id },
          { $set: { "members.$.name": newName } },
          { "members.id": session.user.id.toString() },
          { $set: { "members.$[elem].name": newName } },
          { arrayFilters: [{ "elem.id": session.user.id.toString() }] }
        );

        propagated = true;
      }

      return NextResponse.json({ 
        message: propagated ? "Profil mis à jour et propagé dans vos contenus" : "Profil mis à jour avec succès",
        propagated
      });
    }

  } catch (error) {
    console.error("Erreur mise à jour profil:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du profil" },
      { status: 500 }
    );
  }
}
