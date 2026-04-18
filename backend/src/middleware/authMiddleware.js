const User = require("../models/User");
const { verifyAuthToken } = require("../utils/auth");

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return res.status(401).json({ error: "Authentication required" });

    const payload = verifyAuthToken(token);
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Authentication required" });
    }

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Authentication required" });
  }
}

module.exports = { requireAuth };
