import { config } from "./config";
import { app } from "./app";
import mongoose from "mongoose";

const isProd = config.NODE_ENV === "production";

const connectMongo = () => {
  mongoose
    .set("strictQuery", false)
    .set("autoIndex", isProd)
    .connect(config.MONGO_DB_URI, { enableUtf8Validation: false })
    .then(() => {
      // eslint-disable-next-line no-console
      console.log("🗄  MongoDB connected");
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Error connecting with MongoDB", err);
      // eslint-disable-next-line no-console
      console.warn("Retrying to connect to MongoDB...");
      setTimeout(() => connectMongo(), 5000);
    });
};

connectMongo();

app.listen({ port: config.PORT }, () => {
  // eslint-disable-next-line no-console
  console.log(
    `🚀 RAG chat Server ready at http://localhost:${config.PORT}`
  );
  // eslint-disable-next-line no-console
  console.log(`🤖 RAG chat Server running`);
});
