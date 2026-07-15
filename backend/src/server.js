const app = require("./app");
const config = require("./config");
const prisma = require("./lib/prisma");

async function main() {
  try {
    // ─── Verify database connection ───
    await prisma.$connect();
    console.log("✅ Connected to PostgreSQL database");

    // ─── Start server ───
    app.listen(config.port, () => {
      console.log(
        `🚀 ExpenseIQ API running on port ${config.port} [${config.nodeEnv}]`
      );
      console.log(`   Health check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// ─── Graceful shutdown ───
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

main();
