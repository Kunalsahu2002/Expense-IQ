const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const config = require("./config");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// ─── Security headers ───
app.use(helmet());

// ─── CORS ───
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Body parsing ───
app.use(express.json({ limit: "10mb" })); // Limit body size
app.use(express.urlencoded({ extended: true }));

// ─── Request logging ───
if (config.nodeEnv !== "test") {
  app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));
}

// ─── Health check (no auth required) ───
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// ─── Serve static files (like avatars) ───
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ─── API routes ───
app.use(routes);

// ─── 404 handler for unmatched routes ───
app.use((req, res, next) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} not found.`,
    },
  });
});

// ─── Central error handler (must be last) ───
app.use(errorHandler);

module.exports = app;
