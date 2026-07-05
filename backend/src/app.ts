import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./errors/error-handler.js";
import { logger } from "./config/logger.js";

const app = express();

// 1. Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// 2. Rate Limiting (100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});
app.use("/api", limiter);

// 3. Logging & Parser Middlewares
const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(
  morgan(morganFormat, {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. OpenAPI Swagger Specs (Production-grade specs inline)
const openApiSpecification = {
  openapi: "3.0.0",
  info: {
    title: "Distributed Job Scheduler API",
    version: "1.0.0",
    description: "API specifications for the Distributed Job Scheduler system.",
  },
  servers: [
    {
      url: "/api",
      description: "Local Backend Server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
      },
    },
  },
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                  name: { type: "string" },
                  orgName: { type: "string" },
                },
                required: ["email", "password", "name"],
              },
            },
          },
        },
        responses: { 201: { description: "User registered" } },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Logs user session in",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: { 200: { description: "Session started" } },
      },
    },
  },
};

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpecification));

// 5. Mount API Routes
app.use("/api", apiRoutes);

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// 6. Global Error Handler
app.use(errorHandler);

export default app;
export { app };
