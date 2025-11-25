import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Fetches a specific session with its transcript segments with session Id
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "Invalid session Id" }, { status: 400 });
        }

        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const recordingSession = await prisma.recordingSession.findUnique({
            where: { id },
            include: { segments: true },
        });

        if (!recordingSession) {
            return NextResponse.json({ error: "Session Not found" }, { status: 404 });
        }

        // Verify ownership
        if (recordingSession.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({ session: recordingSession });

    } catch (err: any) {
        console.error("Error fetching session details:", err);
        return NextResponse.json(
            { error: `There was an error fetching the particular session details: ${err.message}` },
            { status: 500 }
        );
    }
}