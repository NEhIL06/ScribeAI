import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../../../packages/database/src";

export const sessionsRouter = Router();

const createSchema = z.object({ title: z.string().optional() });

sessionsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  const userId = (req as any).user.id;
  const session = await prisma.session.create({
    data: {
      userId,
      title: parsed.data.title ?? "Untitled Session",
    },
  });

  res.json({ session });
});

sessionsRouter.get("/", async (req, res) => {

  const userId = (req as any).user.id;
  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ sessions });
});

sessionsRouter.get("/:id", async (req, res) => {
  const { id } = req.params;
  const session = await prisma.session.findUnique({
    where: { id },
    include: { segments: true },
  });
  if (!session) return res.status(404).json({ error: "Not found" });
  res.json({ session });
});
