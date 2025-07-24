import z from "zod";

export interface AssistParams {
  query: string;
  context: Record<string, string>;
  language: string;
  user: User;
}

export interface UserEvent {
  id: string;
  title: string;
  start: Date;
  type: string;
}
export interface User {
  id: string;
  username: string;
  language: string;
}

export interface ChatHistory {
  role: "user" | "ai";
  message: string;
}

export interface ChatResponse {
  response: string;
  contextCount: number;
}

export interface SemanticSearchRequest {
  query: string;
  context: string;
  topK?: number;
}

export interface SemanticSearchResult {
  text: string;
  context: string;
  score: number;
  embedding: number[];
}

export interface CachedSearchResult {
  text: string;
  context: string;
  score: number;
  embedding: number[];
  id: string;
  answer: string;
  hits: string;
}

export interface SemanticSearchResponse {
  results: SemanticSearchResult[];
}

export interface CachedSearchResponse {
  results: CachedSearchResult[];
}

export interface PromptRequest {
  prompt: string;
  language: string;
}

export interface PromptResponse {
  response: string;
}
