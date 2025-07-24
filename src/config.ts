
export const config = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  AI_PROVIDER: process.env.AI_PROVIDER || "gemini",
  MESSAGE_WINDOW_SIZE: process.env.MESSAGE_WINDOW_SIZE || "5",
  MODE: process.env.MODE || "normal",
  MONGO_DB_URI:
    process.env.MONGO_DB_URI || "mongodb://localhost:27017/rag_local",
};
