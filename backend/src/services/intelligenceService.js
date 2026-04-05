const btcRegex = /(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}/;
const ethRegex = /\b0x[a-fA-F0-9]{40}\b/;
const urlRegex = /(https?:\/\/[^\s]+)/gi;
const phoneRegex = /\+?\d[\d\-\s]{7,}/g;
const keywords = ["crypto", "bitcoin", "wallet", "transfer", "usdt", "ethereum"];

function getFlags(record) {
  const flags = [];
  const text = `${record.content || ""} ${record.from || ""} ${record.to || ""}`.toLowerCase();
  const metadataValues = Object.values(record.metadata || {})
    .filter((v) => v !== null && v !== undefined)
    .map((v) => String(v))
    .join(" ")
    .toLowerCase();
  const mergedText = `${text} ${metadataValues}`;

  if (
    btcRegex.test(record.content || "") ||
    ethRegex.test(record.content || "") ||
    ethRegex.test(metadataValues) ||
    keywords.some((k) => mergedText.includes(k))
  ) {
    flags.push("CRYPTO");
  }

  const participants = [record.from, record.to].filter(Boolean);
  const hasForeign = participants.some((n) => n.startsWith("+") && !n.startsWith("+91"));
  if (hasForeign) flags.push("FOREIGN");

  if (urlRegex.test(record.content || "") || urlRegex.test(metadataValues)) flags.push("LINK");

  if (record.type === "call" && Number(record.durationSeconds || 0) >= 600) flags.push("LONG_CALL");

  const suspiciousValue = String(
    record.metadata?.suspicious_activity ?? record.metadata?.suspiciousActivity ?? ""
  ).toLowerCase();
  if (suspiciousValue === "yes" || suspiciousValue === "true" || suspiciousValue === "1") {
    flags.push("SUSPICIOUS");
  }

  if (phoneRegex.test(record.content || "")) flags.push("PHONE_IN_TEXT");

  return [...new Set(flags)];
}

module.exports = { getFlags, keywords };
