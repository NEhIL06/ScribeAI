import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";

const createSchema = z.object({
    title: z.string().optional()
});

export async function GET(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized", status: 401 }, { status: 401 });
        }

        const sessions = await prisma.recordingSession.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            include: {
                segments: true
            }
        });

        return NextResponse.json({ sessions });
    } catch (err: any) {
        console.error("Error fetching sessions:", err);
        return NextResponse.json(
            { error: `There was an error fetching sessions: ${err.message}` },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        console.log("Creating new session...");
        const session = await auth.api.getSession({
            headers: await headers()
        });
        console.log("Session fetched:", session);
        if (!session?.user) {
            console.log("Unauthorized");
            return NextResponse.json({ error: "Unauthorized", status: 401 }, { status: 401 });
        }
        console.log("Parsing request body...");
        const body = await req.json();
        const parsed = createSchema.safeParse(body);
        console.log("Parsed body:", parsed);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }
        console.log("Creating session in database...");
        const newSession = await prisma.recordingSession.create({
            data: {
                userId: session.user.id,
                title: parsed.data.title ?? "Untitled Session",
            },
        });
        console.log("New session created:", newSession);
        return NextResponse.json({ session: newSession }, { status: 201 });
    } catch (err: any) {
        console.error("Error creating session:", err);
        return NextResponse.json(
            { error: `There was an error creating a new session: ${err.message}` },
            { status: 500 }
        );
    }
}
