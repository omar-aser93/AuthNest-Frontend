import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Route Handler (get socket token)
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  if (!token) return NextResponse.json({ token: null }, { status: 401 });
  return NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } });
}