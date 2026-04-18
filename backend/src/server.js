require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { connectDB } = require("./config/db");
const { ensureBootstrapData } = require("./services/bootstrapService");
const apiRoutes = require("./routes");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use("/api", apiRoutes);
app.get("/health", (_, res) => res.json({ ok: true, service: "ufdr-ai-backend" }));

const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ufdr_ai";

connectDB(mongoUri)
  .then(ensureBootstrapData)
  .then(() => {
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch((err) => {
    console.error("Startup failed:", err.message);
    process.exit(1);
  });
