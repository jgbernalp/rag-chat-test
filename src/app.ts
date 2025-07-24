import express from "express";
import asyncHandler from "express-async-handler";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";
import { HTTPError } from "./HTTPError";
import { config } from "./config";
import { chatHandler } from "./handlers/chatHandler";
import { semanticSearchHandler } from "./handlers/semanticSearchHandler";
import { vectorizeHandler } from "./handlers/vectorizeHandler";
import {
  chatPayloadSchema,
  semanticSearchPayloadSchema,
  validateHandler,
  vectorizePayloadSchema
} from "./validators";

const isDev = config.NODE_ENV != "production";

export const app = express();

app.set("trust proxy", 3);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    // eslint-disable-next-line no-console
    console.warn(
      `Rate limit exceeded for ${req.ip}: ${req.method} ${req.originalUrl}`
    );
    throw new HTTPError({
      status: options.statusCode,
      message: "Too many requests, please try again later.",
    });
  },
});

// Apply the rate limiting middleware to API routes
app.use("/api/", apiLimiter);

const jsonErrorHandler = (
  err: Error,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) => {
  // eslint-disable-next-line no-console
  console.error("Server error:", err);

  if (err instanceof HTTPError) {
    res
      .status(err.status)
      .send({ error: err.message, data: isDev ? err : null });
  } else if (err instanceof z.ZodError) {
    res.status(400).send({ error: "Invalid input", issues: err.errors });
  } else {
    res.status(500).send({ error: err.message, data: isDev ? err : null });
  }
};

const authorize = (
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction
) => {
  if (isDev) {
    return next();
  }

  const apiKey = req.headers.authorization
    ? req.headers.authorization?.split("Bearer ")?.[1]
    : "";

  next();
};

app.use(helmet());
app.disable("x-powered-by");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/healthz", (_req, res) => {
  res.status(200).send("OK");
});

app.post(
  "/api/v1/chat",
  authorize,
  validateHandler(chatPayloadSchema),
  asyncHandler(chatHandler)
);

app.post(
  "/api/v1/vectorize",
  authorize,
  validateHandler(vectorizePayloadSchema),
  asyncHandler(vectorizeHandler)
);
app.post(
  "/api/v1/semantic-search",
  authorize,
  validateHandler(semanticSearchPayloadSchema),
  asyncHandler(semanticSearchHandler)
);

app.all("*", (_req, _res, next) => {
  next(new HTTPError({ status: 404, message: "Not found" }));
});

app.use(jsonErrorHandler);
