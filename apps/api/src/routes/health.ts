/**
 * 
 * Implements a health check endpoint for the HTTP server.
 * 
 */

import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (req: any, res: any) => 
    res.json({ ok: true, time: new Date().toISOString()})
);
