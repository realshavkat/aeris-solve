export const runtime = "nodejs";
import { NextResponse } from "next/server";

export async function GET() {
  const id = process.env.DISCORD_CLIENT_ID || "";
  const secret = process.env.DISCORD_CLIENT_SECRET || "";
  const na = process.env.NEXTAUTH_URL || "";

  return NextResponse.json({
    env: process.env.VERCEL_ENV,            // "production" attendu
    hasId: !!id,
    idPreview: id ? id.slice(0,4)+"..."+id.slice(-4) : null, // doit commencer par 1420…
    hasSecret: !!secret,
    secretLen: secret.length,               // doit être > 0
    nextAuthUrl: na,                        // doit être https://aeris-solve.vercel.app (sans / final)
  });
}
