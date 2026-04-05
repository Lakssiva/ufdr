require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Evidence = require("../models/Evidence");
const { getFlags } = require("../services/intelligenceService");

async function seedData() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ufdr_ai";
  await mongoose.connect(uri);
  const count = await Evidence.countDocuments();
  if (count > 0) {
    console.log("Data already exists, skipping seed.");
    await mongoose.disconnect();
    return;
  }
  const samplePath = path.join(process.cwd(), "..","data", "sample-ufdr.json");
  if (!fs.existsSync(samplePath)) {
    console.log("No sample data file found.");
    await mongoose.disconnect();
    return;
  }
  const raw = JSON.parse(fs.readFileSync(samplePath, "utf8"));
  const arr = Array.isArray(raw) ? raw : raw.records || [];
  const docs = arr.map((r) => ({ ...r, flags: getFlags(r), isDemoData: true }));
  await Evidence.insertMany(docs);
  console.log(`Seeded ${docs.length} demo records.`);
  await mongoose.disconnect();
}

seedData().catch(console.error);
