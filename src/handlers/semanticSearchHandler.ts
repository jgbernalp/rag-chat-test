import express from "express";
import { PipelineStage } from "mongoose";
import { z } from "zod";
import { embedContent } from "../backends/gemini";
import { CachedQueriesDBModel } from "../models/CachedQueriesModelDB";
import { EmbeddingDBModel } from "../models/EmbeddingsModelDB";
import { CachedSearchResponse, SemanticSearchResponse } from "../types";
import { semanticSearchPayloadSchema } from "../validators";

type SemanticSearchHandlerInput = z.infer<typeof semanticSearchPayloadSchema>;

const DEFAULT_TOP_K_CONTENT = 4;
const DEFAULT_TOP_K_CACHE = 1;
const CACHE_SEMANTIC_SEARCH_THRESHOLD = 0.96; // Threshold for cached queries semantic search

// More specific input type for the core function
export interface SemanticSearchInput {
  embeddedQuery: Array<number>;
  context: string;
  topK?: number;
}

/**
 * Core semantic search function that can be reused across the application
 * @param input - The semantic search input containing query, context, and topK
 * @returns Promise<SemanticSearchResponse> - The search results
 */
export const performContentSemanticSearch = async (
  input: SemanticSearchInput
): Promise<SemanticSearchResponse> => {
  const { embeddedQuery, context, topK = DEFAULT_TOP_K_CONTENT } = input;

  const pipeline: Array<PipelineStage> = [
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: embeddedQuery,
        numCandidates: topK * 20,
        limit: topK,
        filter: {
          context: { $eq: context },
        },
      },
    } as unknown as PipelineStage, // $vectorSearch is not typed in mongoose, so we cast it to PipelineStage
    {
      $project: {
        text: 1,
        context: 1,
        score: { $meta: "vectorSearchScore" },
        _id: 0,
      },
    },
    {
      $sort: { score: -1 },
    },
  ];

  const searchResults = await EmbeddingDBModel.aggregate(pipeline);

  const response: SemanticSearchResponse = {
    results: searchResults,
  };

  return response;
};

export const performCachedQueriesSemanticSearch = async (
  input: SemanticSearchInput
): Promise<CachedSearchResponse> => {
  const { embeddedQuery, context, topK = DEFAULT_TOP_K_CACHE } = input;

  const pipeline: Array<PipelineStage> = [
    {
      $vectorSearch: {
        index: "vector_index_cached_queries",
        path: "embedding",
        queryVector: embeddedQuery,
        numCandidates: topK * 20,
        limit: topK,
        filter: {
          context: { $eq: context },
        },
      },
    } as unknown as PipelineStage, // $vectorSearch is not typed in mongoose, so we cast it to PipelineStage
    {
      $project: {
        text: 1,
        context: 1,
        answer: 1,
        _id: 1,
        id: "$_id",
        score: { $meta: "vectorSearchScore" },
      },
    },
    {
      $match: {
        score: { $gt: CACHE_SEMANTIC_SEARCH_THRESHOLD }, // Filter out low-scoring results, meaning different queries
      },
    },
    {
      $sort: { score: -1 },
    },
  ];

  const searchResults = await CachedQueriesDBModel.aggregate(pipeline);

  const response: CachedSearchResponse = {
    results: searchResults,
  };

  return response;
};

export const semanticSearchHandler = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  const input: SemanticSearchHandlerInput = req.body;

  try {
    const embeddedQuery = await embedContent(input.query);

    // check if a cached query exists
    const cachedResponse = await performCachedQueriesSemanticSearch({
      embeddedQuery,
      ...input,
    });

    if (cachedResponse.results.length > 0) {
      res.status(200).json({
        results: cachedResponse.results.map((result) => ({
          text: result.answer,
          context: result.context,
          score: result.score,
        })),
      });

      return;
    }

    const response = await performContentSemanticSearch({
      embeddedQuery,
      ...input,
    });

    if (response.results.length > 0) {
      // store the response in the cache
      const firstResult = response.results[0];

      await CachedQueriesDBModel.create({
        context: input.context,
        text: input.query,
        embedding: firstResult.embedding,
        answer: firstResult.text,
      });
    }

    res.status(200).json(response);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Semantic search error:", error);
    res.status(500).json({
      error: "Semantic search failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
