require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const { hashPassword, normalizeOfficerId } = require("./auth");

function readArg(name, fallback = "") {
  const flag = `--${name}=`;
  const entry = process.argv.find((item) => item.startsWith(flag));
  return entry ? entry.slice(flag.length) : fallback;
}

async function main() {
  const officerId = normalizeOfficerId(readArg("officerId"));
  const password = readArg("password");
  const name = readArg("name", officerId || "UFDR Officer");
  const role = readArg("role", "officer");

  if (!officerId || !password) {
    throw new Error("Usage: npm run create-user -- --officerId=IO-2024-156 --password=YourPassword --name=Officer Name");
  }

  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ufdr_ai";
  await mongoose.connect(uri);

  const passwordHash = await hashPassword(password);
  const user = await User.findOneAndUpdate(
    { officerId },
    { officerId, name, role, isActive: true, passwordHash },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`User ready: ${user.officerId}`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  try { await mongoose.disconnect(); } catch (_err) { /* ignore */ }
  process.exit(1);
});
