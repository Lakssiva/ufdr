const Evidence = require("../models/Evidence");

async function buildSourceScopedQuery(sourceScope, sourceFile) {
  if (sourceScope === "all") {
    return { query: {}, sourceScope: "all", resolvedSourceFile: null };
  }
  if (sourceScope === "file" && sourceFile) {
    return { query: { sourceFile }, sourceScope: "file", resolvedSourceFile: sourceFile };
  }
  // latest
  const latest = await Evidence.findOne({ sourceFile: { $nin: [null, ""] } })
    .sort({ createdAt: -1 })
    .lean();
  if (latest?.sourceFile) {
    return { query: { sourceFile: latest.sourceFile }, sourceScope: "latest", resolvedSourceFile: latest.sourceFile };
  }
  return { query: {}, sourceScope: "all", resolvedSourceFile: null };
}

module.exports = { buildSourceScopedQuery };
