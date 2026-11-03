import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { env } from "./config/env";
import { requestLogger } from "./middleware/requestLogger.middleware";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware";
import { apiLimiter } from "./middleware/rateLimit.middleware";
import routes from "./routes";

// CORS_ORIGIN may be a single origin or a comma-separated list — split once at startup.
const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

export function createApp(): Application {
  const app = express();

  // Trust the hosting proxy's X-Forwarded-* headers so rate limiting and
  // request logging see the real client IP.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);
  app.use(apiLimiter);

  app.use("/api/v1", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
