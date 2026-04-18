const fs = require("fs");
const path = require("path");
const Evidence = require("../models/Evidence");
const User = require("../models/User");
const { getFlags } = require("./intelligenceService");
const { hashPassword, normalizeOfficerId } = require("../utils/auth");

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

async function ensureDefaultOfficer() {
  const officerId = normalizeOfficerId(process.env.DEFAULT_OFFICER_ID || "IO-2024-156");
  const password = process.env.DEFAULT_OFFICER_PASSWORD || "UFDR@123";
  const name = process.env.DEFAULT_OFFICER_NAME || "Investigating Officer";
  const role = process.env.DEFAULT_OFFICER_ROLE || "admin";

  const existing = await User.findOne({ officerId });
  if (existing) return;

  const passwordHash = await hashPassword(password);
  await User.create({ officerId, name, passwordHash, role, isActive: true });
  console.log(`Default officer seeded: ${officerId}`);
}

async function ensureBootstrapData() {
  await ensureDemoData();
  await ensureDefaultOfficer();
}

module.exports = { ensureBootstrapData };
