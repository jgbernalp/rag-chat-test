import request from "supertest";
import { app } from "../../app";
import { EmbeddingDBModel } from "../../models/EmbeddingsModelDB";
import { CachedQueriesDBModel } from "../../models/CachedQueriesModelDB";
import * as gemini from "../../backends/gemini";

jest.mock("../../config", () => ({
  config: {
    NODE_ENV: "test",
    AI_PROVIDER: "openai",
    OPENAI_API_KEY: "test_openai_key",
    GEMINI_API_KEY: "test_gemini_key",
    PORT: 5000,
    MESSAGE_WINDOW_SIZE: "5",
    MODE: "normal",
    MONGO_DB_URI: "mongodb://localhost:27017/rag_local_test",
  },
}));

jest.mock("@langchain/google-genai");
jest.mock("../../models/EmbeddingsModelDB");
jest.mock("../../models/CachedQueriesModelDB");
jest.mock("../../backends/gemini");

describe("POST /api/v1/semantic-search", () => {
  let mockEmbedQuery: jest.Mock;
  let mockContentAggregate: jest.Mock;
  let mockCacheAggregate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockEmbedQuery = jest.fn();
    mockContentAggregate = jest.fn();
    mockCacheAggregate = jest.fn();

    (gemini.embedContent as jest.Mock) = mockEmbedQuery;
    (EmbeddingDBModel.aggregate as jest.Mock) = mockContentAggregate;
    (CachedQueriesDBModel.aggregate as jest.Mock) = mockCacheAggregate;

    mockCacheAggregate.mockResolvedValue([]);
  });

  it("should return semantic search results successfully", async () => {
    const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
    const mockResults = [
      {
        text: "Sample text about programming",
        context: "programming",
        score: 0.95,
        embedding: mockEmbedding,
      },
      {
        text: "Another text about coding",
        context: "programming",
        score: 0.85,
        embedding: mockEmbedding,
      },
    ];

    mockEmbedQuery.mockResolvedValue(mockEmbedding);
    mockContentAggregate.mockResolvedValue(mockResults);

    const response = await request(app).post("/api/v1/semantic-search").send({
      query: "programming concepts",
      context: "programming",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ results: mockResults });

    expect(mockEmbedQuery).toHaveBeenCalledWith("programming concepts");
    expect(mockContentAggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          $vectorSearch: expect.objectContaining({
            index: "vector_index",
            path: "embedding",
            queryVector: mockEmbedding,
            numCandidates: 80,
            limit: 4,
            filter: {
              context: { $eq: "programming" },
            },
          }),
        }),
      ])
    );
  });

  it("should return 400 for missing required fields", async () => {
    const response = await request(app).post("/api/v1/semantic-search").send({
      query: "test query",
      // missing context
    });

    expect(response.status).toBe(400);
  });

  it("should handle embedding service errors", async () => {
    mockEmbedQuery.mockRejectedValue(new Error("Gemini API error"));

    const response = await request(app).post("/api/v1/semantic-search").send({
      query: "test query",
      context: "test context",
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "Semantic search failed",
      message: "Gemini API error",
    });
  });

  it("should handle database errors", async () => {
    const mockEmbedding = [0.1, 0.2, 0.3];
    mockEmbedQuery.mockResolvedValue(mockEmbedding);
    mockContentAggregate.mockRejectedValue(
      new Error("Database connection error")
    );

    const response = await request(app).post("/api/v1/semantic-search").send({
      query: "test query",
      context: "test context",
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "Semantic search failed",
      message: "Database connection error",
    });
  });

  it("should use default topK value when not provided", async () => {
    const mockEmbedding = [0.1, 0.2, 0.3];
    mockEmbedQuery.mockResolvedValue(mockEmbedding);
    mockContentAggregate.mockResolvedValue([]);

    await request(app).post("/api/v1/semantic-search").send({
      query: "test query",
      context: "test context",
    });

    expect(mockContentAggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          $vectorSearch: expect.objectContaining({
            numCandidates: 80,
            limit: 4,
          }),
        }),
      ])
    );
  });
});
