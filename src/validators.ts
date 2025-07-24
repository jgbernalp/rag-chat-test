import express from "express";
import { z } from "zod";

export const chatPayloadSchema = z.object({
  prompt: z
    .string()
    .max(2000, "Prompt must be less than 2000 characters")
    .optional(),
  message: z
    .string()
    .min(1, "Message is required")
    .max(1000, "Message must be less than 1000 characters"),
  language: z.string().min(1, "language is required"),
  ragContextKey: z.string().min(1, "RAG context key is required").optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "ai"]),
        message: z.string().min(1, "Message is required"),
      })
    )
    .optional(),
});

export const vectorizePayloadSchema = z.object({
  url: z.string().url("Invalid URL format"),
  context: z.string().min(1, "Context is required"),
  replace: z.boolean(),
});

export const semanticSearchPayloadSchema = z.object({
  query: z
    .string()
    .min(1, "Query is required")
    .max(1500, "Query must be less than 1500 characters"),
  context: z.string().min(1, "Context is required"),
  topK: z.number().optional().default(5),
});

export const promptPayloadSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(4000, "Prompt must be less than 4000 characters"),
  language: z.string().min(1, "Language is required"),
});

export const validateHandler =
  (schema: z.AnyZodObject) =>
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
