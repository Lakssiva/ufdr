const fs = require("fs");
const path = require("path");
const Evidence = require("../models/Evidence");
const { getFlags } = require("./intelligenceService");

async function ensureDemoData() {
  const count = await Evidence.countDocuments();
  if (count > 0) return;
  const samplePath = path.join(process.cwd(), "..", "data", "sample-ufdr.json");
  if (!fs.existsSync(samplePath)) return;
  try {
    const raw = JSON.parse(fs.readFileSync(samplePath, "utf8"));
    const arr = Array.isArray(raw) ? raw : raw.records || [];
    const docs = arr.map((r) => ({ ...r, flags: getFlags(r), isDemoData: true }));
    await Evidence.insertMany(docs);
    console.log(`Auto-seeded ${docs.length} demo records.`);
  } catch (e) {
    console.error("Bootstrap seed failed:", e.message);
  }
}

module.exports = { ensureDemoData };
