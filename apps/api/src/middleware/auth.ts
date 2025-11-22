import type { Request, Response, NextFunction } from "express";
//TODO figure out how to place the Prisma Client based on deployment
import { useSession } from "../../../web/scribeai_frontend/lib/auth-client";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const {data: session} = useSession();
  if(!session || !session.user) {
    return res.status(401).json({ error: "Invalid session" });
  }
  try {
    (req as any).user = session?.user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid auth token" });
  }
}
