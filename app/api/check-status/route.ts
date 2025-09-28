import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongoose";
import User from "@/models/user";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ status: "unauthenticated" }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ discordId: session.user.discordId });
    
    if (!user) {
      return NextResponse.json({ status: "not_found" }, { status: 404 });
    }

    // Ajouter un cache-control pour limiter les requêtes
    const response = NextResponse.json({
      status: user.status,
      role: user.role
    });
    
    response.headers.set('Cache-Control', 'private, max-age=10');
    return response;

  } catch (error) {
    console.error("Check status error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

