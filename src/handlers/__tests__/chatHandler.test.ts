import request from "supertest";
import { geminiChatResponse } from "../../backends/gemini";
import { config } from "../../config";
import { app } from "../../app";

jest.mock("../../backends/gemini");
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

describe("chatHandler", () => {
  const mockGeminiChatResponse = geminiChatResponse as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Chat is only available with Gemini provider
    (config as jest.Mocked<typeof config>).AI_PROVIDER = "gemini";
    (config as jest.Mocked<typeof config>).NODE_ENV = "test";
  });

  it("should return 200 and AI response for valid input with gemini provider", async () => {
    const mockRequestBody = {
      language: "en",
      message: "Hello",
      history: [],
    };
    const mockResponseAI = { response: "Hi there!" };
    mockGeminiChatResponse.mockResolvedValue(mockResponseAI);

    const response = await request(app)
      .post("/api/v1/chat")
      .send(mockRequestBody);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockResponseAI);
    expect(mockGeminiChatResponse).toHaveBeenCalledWith(
      {
        language: mockRequestBody.language,
        message: mockRequestBody.message,
        history: mockRequestBody.history,
      },
      "test_gemini_key"
    );
  });

  it("should return 500 if AI_PROVIDER is not gemini", async () => {
    (config as jest.Mocked<typeof config>).AI_PROVIDER = "other";
    const mockRequestBody = { language: "en", message: "Hello" };

    const response = await request(app)
      .post("/api/v1/chat")
      .send(mockRequestBody);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "AI chat: error getting response",
    });
    expect(mockGeminiChatResponse).not.toHaveBeenCalled();
  });

  it("should return 500 if geminiChatResponse throws an error", async () => {
    const mockRequestBody = { language: "en", message: "Hello" };
    const errorMessage = "Gemini API error";
    mockGeminiChatResponse.mockRejectedValue(new Error(errorMessage));

    const response = await request(app)
      .post("/api/v1/chat")
      .send(mockRequestBody);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "AI chat: error getting response",
    });
  });

  it("should return 500 if AI response is missing message", async () => {
    const mockRequestBody = { language: "en", message: "Hello" };
    const mockResponseAI = { response: "" }; // Empty response
    mockGeminiChatResponse.mockResolvedValue(mockResponseAI);

    const response = await request(app)
      .post("/api/v1/chat")
      .send(mockRequestBody);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "AI chat: error getting response",
    });
  });

  it("should return 500 if AI response is undefined", async () => {
    const mockRequestBody = { language: "en", message: "Hello" };
    const mockResponseAI = { response: undefined }; // Undefined response
    mockGeminiChatResponse.mockResolvedValue(mockResponseAI);

    const response = await request(app)
      .post("/api/v1/chat")
      .send(mockRequestBody);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "AI chat: error getting response",
    });
  });

  it("should use empty history if history is not provided", async () => {
    const mockRequestBody = {
      language: "en",
      message: "Hello",
      // No history provided
    };
    const mockResponseAI = { response: "Hi there!" };
    mockGeminiChatResponse.mockResolvedValue(mockResponseAI);

    const response = await request(app)
      .post("/api/v1/chat")
      .send(mockRequestBody);

    expect(response.status).toBe(200);
    expect(mockGeminiChatResponse).toHaveBeenCalledWith(
      {
        language: mockRequestBody.language,
        message: mockRequestBody.message,
        history: [], // Expect empty array
      },
      "test_gemini_key"
    );
  });
});
