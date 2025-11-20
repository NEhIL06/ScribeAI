import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { sessionsRouter } from "./routes/session";
import { healthRouter } from "./routes/health";

dotenv.config();

const app = express();

const allowredOrigins = process.env.CORS_ALLOWED_ORIGINS || "*";
app.use(cors());
app.use(express.json());

app.use("/v1/sessions", sessionsRouter);
app.use("/health", healthRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
