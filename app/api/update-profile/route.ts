import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import User from "@/models/user";

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
    }

    const { rpName, anonymousNickname } = await request.json();

    if (!rpName || !anonymousNickname) {
      return NextResponse.json(
        { message: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    const user = await User.findByIdAndUpdate(
      session.user.id,
      { rpName, anonymousNickname },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { message: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Profil mis à jour avec succès" });
    
  } catch (error) {
    console.error('Update Error:', error);
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}
