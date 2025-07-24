/* eslint-disable no-console */

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import axios from "axios";
import express from "express";
import pdf from "pdf-parse";
import z from "zod";
import { embedContent } from "../backends/gemini";
import { EmbeddingDBModel } from "../models/EmbeddingsModelDB";
import { vectorizePayloadSchema } from "../validators";

type VectorizeHandlerInput = z.infer<typeof vectorizePayloadSchema>;

export const vectorizeHandler = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  const { url, context, replace }: VectorizeHandlerInput = req.body;

  try {
    // Download PDF from URL
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000, // 30 second timeout
    });

    // Parse PDF content
    const pdfBuffer = Buffer.from(response.data) as Buffer;
    const pdfData = await pdf(pdfBuffer);
    const text = pdfData.text;

    if (!text || text.trim().length === 0) {
      res.status(400).json({
        error: "No text content found in the PDF",
      });
      return;
    }

    console.log(`Downloaded PDF and extracted text successfully: ${url}`);

    // Split text using RecursiveCharacterTextSplitter
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const textChunks = await textSplitter.splitText(text);

    console.log("Text split into chunks:", textChunks.length);

    if (replace === true) {
      console.log("Removing existing embeddings for context:", context);
      await EmbeddingDBModel.deleteMany({ context: context });
    }

    console.log("Storing embeddings for context:", context);

    // Generate embeddings and store in database
    const embeddingPromises = textChunks.map(async (chunk, index) => {
      try {
        // Generate embedding for this chunk
        const embedding = await embedContent(chunk);

        // Create document for MongoDB
        const embeddingDoc = new EmbeddingDBModel({
          context: context,
          text: chunk,
          embedding: embedding,
        });

        // Save to database
        await embeddingDoc.save();

        return {
          success: true,
          chunkIndex: index,
          textLength: chunk.length,
        };
      } catch (error) {
        return {
          success: false,
          chunkIndex: index,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    // Wait for all embeddings to be processed
    const results = await Promise.all(embeddingPromises);

    // Count successes and failures
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    // Return response
    res.json({
      message: "PDF processing completed",
      url: url,
      context: context,
      totalChunks: textChunks.length,
      successfulEmbeddings: successCount,
      failedEmbeddings: failureCount,
    });
  } catch (error) {
    let errorMessage = "An unexpected error occurred";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Handle specific error types
      if (error.message.includes("timeout")) {
        statusCode = 408;
        errorMessage = "Request timeout while downloading PDF";
      } else if (
        error.message.includes("Network Error") ||
        error.message.includes("ENOTFOUND")
      ) {
        statusCode = 400;
        errorMessage = "Could not download PDF from the provided URL";
      }
    }

    res.status(statusCode).json({
      error: errorMessage,
      url: url,
      context: context,
    });
  }
};
