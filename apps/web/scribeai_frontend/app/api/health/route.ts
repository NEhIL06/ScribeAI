import { NextRequest, NextResponse } from "next/server";

// Health check endpoint for the HTTP server.
export async function GET() {
  return NextResponse.json({ ok: true, time: new Date().toISOString() });
}