import mongoose, { Document, Schema } from "mongoose";

interface CachedQueryModel {
  context: string;
  text: string;
  answer: string;
  hits: number;
  embedding: number[];
}

export type CachedQueriesDB = CachedQueryModel & Document<string>;

const cachedQueriesDBSchema = new Schema(
  {
    context: { type: String, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true, default: [] },
    answer: { type: String, required: true },
    hits: { type: Number, default: 0 },
  },
  { timestamps: true }
);

cachedQueriesDBSchema.index({ context: 1 });
// The vector search index is created in mongo Atlas UI, not here.

export const CachedQueriesDBModel = mongoose.model<CachedQueriesDB>(
  "ai_cached_queries",
  cachedQueriesDBSchema
);
