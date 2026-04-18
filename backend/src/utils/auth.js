const crypto = require("crypto");

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

function toBase64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64Url(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function normalizeOfficerId(officerId = "") {
  return officerId.trim().toUpperCase();
}

function getTokenSecret() {
  return process.env.JWT_SECRET || "ufdr-dev-secret-change-me";
}

async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

async function verifyPassword(password, storedHash = "") {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      const incoming = Buffer.from(key, "hex");
      if (incoming.length !== derivedKey.length) return resolve(false);
      resolve(crypto.timingSafeEqual(incoming, derivedKey));
    });
  });
}

function createAuthToken(user) {
  const payload = {
    sub: String(user._id),
    officerId: normalizeOfficerId(user.officerId),
    role: user.role || "officer",
    exp: Date.now() + TOKEN_TTL_MS
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", getTokenSecret()).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function verifyAuthToken(token = "") {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) throw new Error("Invalid token");
  const expectedSignature = crypto.createHmac("sha256", getTokenSecret()).update(encodedPayload).digest("base64url");
  const incoming = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (incoming.length !== expected.length || !crypto.timingSafeEqual(incoming, expected)) {
    throw new Error("Invalid token");
  }
  const payload = JSON.parse(fromBase64Url(encodedPayload));
  if (!payload?.sub || !payload?.officerId || !payload?.exp) throw new Error("Invalid token");
  if (payload.exp < Date.now()) throw new Error("Token expired");
  return payload;
}

module.exports = {
  createAuthToken,
  hashPassword,
  normalizeOfficerId,
  verifyAuthToken,
  verifyPassword
};
