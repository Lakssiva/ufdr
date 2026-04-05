const { keywords } = require("./intelligenceService");

async function questionToFilter(question) {
  const q = question.toLowerCase();
  const filter = {};

  if (/\bchat|whatsapp|telegram|signal|message\b/.test(q)) filter.type = "chat";
  else if (/\bcall|phone call|duration\b/.test(q)) filter.type = "call";
  else if (/\bcontact\b/.test(q)) filter.type = "contact";

  if (/crypto|bitcoin|wallet|usdt|eth|btc/.test(q)) filter.flags = "CRYPTO";
  else if (/foreign|international/.test(q)) filter.flags = "FOREIGN";
  else if (/long call|10 min/.test(q)) filter.flags = "LONG_CALL";
  else if (/link|url|http/.test(q)) filter.flags = "LINK";
  else if (/suspicious/.test(q)) filter.flags = "SUSPICIOUS";

  const fromMatch = q.match(/from\s+(\+?[\d\s\-]{7,})/);
  if (fromMatch) filter.from = fromMatch[1].trim();

  const toMatch = q.match(/to\s+(\+?[\d\s\-]{7,})/);
  if (toMatch) filter.to = toMatch[1].trim();

  let dateFrom = null;
  if (/last 30 days/.test(q)) {
    dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  } else if (/last 7 days/.test(q)) {
    dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  }

  return { filter, dateFrom, provider: "rules", fallbackReason: null };
}

module.exports = { questionToFilter };
