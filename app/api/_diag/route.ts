export const runtime = "nodejs";
import { NextResponse } from "next/server";

export async function GET() {
  const id = process.env.DISCORD_CLIENT_ID || process.env.AUTH_DISCORD_ID || "";
  const secret = process.env.DISCORD_CLIENT_SECRET || process.env.AUTH_DISCORD_SECRET || "";
  const na = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "";

  return NextResponse.json({
    env: process.env.VERCEL_ENV,      // "production" attendu
    idPreview: id ? id.slice(0,4)+"..."+id.slice(-4) : null,
    hasId: !!id,
    secretLen: secret.length,
    nextAuthUrl: na,
  });
}
