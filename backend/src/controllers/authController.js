const User = require("../models/User");
const { createAuthToken, hashPassword, normalizeOfficerId, verifyPassword } = require("../utils/auth");

function toSafeUser(user) {
  return {
    id: String(user._id),
    officerId: user.officerId,
    name: user.name,
    role: user.role
  };
}

async function login(req, res) {
  try {
    const officerId = normalizeOfficerId(req.body?.officerId);
    const password = req.body?.password || "";
    if (!officerId || !password) {
      return res.status(400).json({ error: "Officer ID and password are required" });
    }

    const user = await User.findOne({ officerId }).lean();
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid officer ID or password" });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid officer ID or password" });
    }

    return res.json({
      token: createAuthToken(user),
      user: toSafeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Login failed" });
  }
}

async function register(req, res) {
  try {
    const name = (req.body?.name || "").trim();
    const officerId = normalizeOfficerId(req.body?.officerId);
    const password = req.body?.password || "";

    if (!name || !officerId || !password) {
      return res.status(400).json({ error: "Name, officer ID, and password are required" });
    }

    const existing = await User.findOne({ officerId }).lean();
    if (existing) {
      return res.status(409).json({ error: "Officer ID already exists" });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name,
      officerId,
      passwordHash,
      role: "officer",
      isActive: true
    });

    return res.status(201).json({
      token: createAuthToken(user),
      user: toSafeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Registration failed" });
  }
}

async function getCurrentUser(req, res) {
  return res.json({ user: toSafeUser(req.user) });
}

module.exports = { getCurrentUser, login, register };
