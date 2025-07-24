import express from "express";
import z from "zod";
import { embedContent, geminiChatResponse } from "../backends/gemini";
import { config } from "../config";
import { CachedQueriesDBModel } from "../models/CachedQueriesModelDB";
import { ChatResponse, SemanticSearchResponse } from "../types";
import { chatPayloadSchema } from "../validators";
import {
  performCachedQueriesSemanticSearch,
  performContentSemanticSearch,
} from "./semanticSearchHandler";

type ChatHandlerInput = z.infer<typeof chatPayloadSchema>;

const SEMANTIC_SEARCH_THRESHOLD = 0.8;

export const chatHandler = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  const { language, message, history, ragContextKey }: ChatHandlerInput =
    req.body;

  try {
    let responseAI: ChatResponse;
    let ragContext: SemanticSearchResponse | undefined = undefined;

    if (config.AI_PROVIDER === "gemini") {
      let embeddedQuery: Array<number> | undefined = undefined;

      const hasRagContext = ragContextKey && ragContextKey.length > 0;

      if (!hasRagContext) {
        // If no ragContextKey is provided, we will call the AI directly
        responseAI = await geminiChatResponse(
          {
            language,
            message,
            history: history || [],
          },
          config.GEMINI_API_KEY
        );
      } else {
        embeddedQuery = await embedContent(message);

        if (!embeddedQuery || embeddedQuery.length === 0) {
          throw new Error("Failed to embed the query content.");
        }

        // check if a cached query exists
        const cachedResponse = await performCachedQueriesSemanticSearch({
          embeddedQuery,
          context: ragContextKey,
        });

        if (cachedResponse.results.length > 0) {
          const firstResult = cachedResponse.results[0];

          if (firstResult.answer) {
            // eslint-disable-next-line no-console
            console.log("Cached query found using cached answer");

            // increment the hits count for the cached query
            await CachedQueriesDBModel.findOneAndUpdate(
              { _id: firstResult.id },
              { $inc: { hits: 1 } }
            );

            res.status(200).json({
              response: firstResult.answer,
              // cached response counts for usage
              contextCount: 2,
            });
            return;
          }
        }

        ragContext = await performContentSemanticSearch({
          context: ragContextKey,
          embeddedQuery,
        });

        if (
          !ragContext ||
          ragContext.results.length === 0 ||
          ragContext.results.every(
            (result) => result.score < SEMANTIC_SEARCH_THRESHOLD
          )
        ) {
          res.status(200).json({
            response: noResultsMessage(language),
          });
          return;
        }

        responseAI = await geminiChatResponse(
          {
            language,
            message,
            history: history || [],
            ragContext,
          },
          config.GEMINI_API_KEY
        );

        // cache the query response
        if (responseAI.response) {
          await CachedQueriesDBModel.create({
            context: ragContextKey,
            text: message,
            embedding: embeddedQuery,
            answer: responseAI.response,
          });
        }
      }
    } else {
      throw new Error("Unsupported AI provider");
    }

    const { response } = responseAI;

    if (response === undefined || response === "") {
      throw new Error("The AI response is missing message.");
    }

    res.status(200).json(responseAI);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("AI chat: error getting response", error);
    res.status(500).send({ error: "AI chat: error getting response" });
  }
};
function noResultsMessage(language: string) {
  switch (language) {
    case "en":
      return "No relevant information found. Please try rephrasing your question.";
    case "es":
      return "No se encontró información relevante. Por favor, intenta reformular tu pregunta.";
    case "fr":
      return "Aucune information pertinente trouvée. Veuillez reformuler votre question.";
    default:
      return "No relevant information found. Please try rephrasing your question.";
  }
}
