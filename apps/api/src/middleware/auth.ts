import type { Request, Response, NextFunction } from "express";
//TODO change to ./scribeai/web
import { verifyAuthToken } from "../../../web/auth";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing auth token" });

  const [, token] = header.split(" ");

  try {
    const session = await verifyAuthToken(token);
    (req as any).user = session.user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid auth token" });
  }
}
