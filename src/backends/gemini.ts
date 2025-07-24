import { GoogleGenAI } from "@google/genai";
import {
  HarmBlockThreshold,
  HarmCategory,
  TaskType,
} from "@google/generative-ai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { config } from "../config";
import {
  ChatHistory,
  ChatResponse,
  PromptResponse,
  SemanticSearchResponse
} from "../types";

const MODEL_ID = "gemini-2.5-flash-preview-05-20";

const EMBEDDING_MODEL_ID = "gemini-embedding-exp-03-07";
const EMBEDDING_MODEL_DIMENSIONS = 768;

let modelInstance: GoogleGenAI | null = null;

export const getGoogleGenAIInstance = () => {
  if (!config.GEMINI_API_KEY) {
    throw new Error("Gemini API key is required for embeddings.");
  }

  if (!modelInstance) {
    modelInstance = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  }

  return modelInstance;
};

export const embedContent = async (content: string) => {
  const genAI = getGoogleGenAIInstance();

  const response = await genAI.models.embedContent({
    model: EMBEDDING_MODEL_ID,
    contents: content,
    config: {
      outputDimensionality: EMBEDDING_MODEL_DIMENSIONS,
      taskType: TaskType.RETRIEVAL_QUERY,
    },
  });

  const values = response.embeddings?.[0]?.values;

  if (!values || values.length !== EMBEDDING_MODEL_DIMENSIONS) {
    throw new Error(
      `Invalid embedding response: expected ${EMBEDDING_MODEL_DIMENSIONS} dimensions, got ${values?.length}`
    );
  }

  return values;
};

const createGeminiModel = (apiKey: string) => {
  if (!apiKey) {
    throw new Error("Gemini API key is required.");
  }
  return new ChatGoogleGenerativeAI({
    model: MODEL_ID,
    apiKey: apiKey,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
  });
};

const escape = (str: string) => {
  return str.replace(/{/g, "{{").replace(/}/g, "}}");
};

export const geminiChatResponse = async (
  {
    prompt,
    language,
    message,
    history,
    ragContext,
  }: {
    prompt?: string;
    language: string;
    message: string;
    history?: Array<ChatHistory>;
    ragContext?: SemanticSearchResponse;
  },
  apiKey: string
): Promise<ChatResponse> => {
  const model = createGeminiModel(apiKey);

  const historyMessages = (history || []).map((h) => ({
    role: h.role,
    content: escape(h.message),
  }));

  const context = ragContext
    ? ragContext.results.map((result) => result.text).join("\n\n")
    : "";

  const promptTemplate = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are a helpful assistant. That always provides very concise and clear answers in {language}.\n\n{context}\n\n{prompt}",
    ],
    ...historyMessages,
    ["user", "{message}"],
  ]);
  const chain = promptTemplate.pipe(model);
  const chainCall = await chain.invoke({
    message,
    language: "en",
    prompt: prompt || "",
    context: `Context: \n\n${context}` || "",
  });

  if (typeof chainCall.content === "string") {
    return {
      response: chainCall.content,
      contextCount: ragContext?.results.length ?? -1,
    };
  } else {
    throw new Error(
      `Invalid response type from Gemini: ${typeof chainCall.content}`
    );
  }
};

export const geminiPromptResponse = async (
  { prompt, language }: { prompt: string; language: string },
  apiKey: string
): Promise<PromptResponse> => {
  const model = createGeminiModel(apiKey);

  const promptTemplate = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are a helpful assistant. Provide clear and concise answers in {language}.",
    ],
    ["user", "{prompt}"],
  ]);

  const chain = promptTemplate.pipe(model);
  const chainCall = await chain.invoke({
    prompt,
    language: "en"
  });

  if (typeof chainCall.content === "string") {
    return {
      response: chainCall.content,
    };
  } else {
    throw new Error(
      `Invalid response type from Gemini: ${typeof chainCall.content}`
    );
  }
};
