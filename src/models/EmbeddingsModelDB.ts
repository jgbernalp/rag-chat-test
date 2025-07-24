import mongoose, { Document, Schema } from "mongoose";

interface EmbeeddingsModel {
  context: string;
  text: string;
  embedding: number[];
}

export type EmbeeddingsDB = EmbeeddingsModel & Document<string>;

const embeddingDBSchema = new Schema(
  {
    context: { type: String, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true, default: [] },
  },
  { timestamps: true }
);

embeddingDBSchema.index({ context: 1 });
// The vector search index is created in mongo Atlas UI, not here.

export const EmbeddingDBModel = mongoose.model<EmbeeddingsDB>(
  "ai_embedding",
  embeddingDBSchema
);
