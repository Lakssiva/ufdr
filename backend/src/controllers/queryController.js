const Evidence = require("../models/Evidence");
const { questionToFilter } = require("../services/queryService");
const { generateAnswer } = require("../services/answerService");
const { buildSourceScopedQuery } = require("../utils/sourceScope");

const EXAMPLES = [
  "Show me chat records containing crypto addresses",
  "List all communications with foreign numbers",
  "Summarize suspicious activities from the last 30 days",
  "Show calls longer than 10 minutes",
  "Extract all URLs and links shared in chats"
];

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function queryEvidence(req, res) {
  try {
    const question = req.body?.question || "";
    const sourceScope = req.body?.sourceScope || "latest";
    const sourceFile = req.body?.sourceFile || "";
    if (!question.trim()) return res.status(400).json({ error: "question is required" });

    const { filter, dateFrom, provider, fallbackReason } = await questionToFilter(question);
    const mongoQuery = {};

    if (filter.type) mongoQuery.type = filter.type;
    if (filter.flags) mongoQuery.flags = filter.flags;
    if (dateFrom) mongoQuery.createdAt = { $gte: dateFrom };

    if (filter.from) {
      const regex = new RegExp(escapeRegex(filter.from), "i");
      mongoQuery.$or = [{ from: regex }, { to: regex }];
    }

    const scoped = await buildSourceScopedQuery(sourceScope, sourceFile);
    Object.assign(mongoQuery, scoped.query);

    let results = await Evidence.find(mongoQuery).sort({ createdAt: -1 }).limit(250).lean();
    let queryFallbackNote = null;

    if (!results.length) {
      results = await Evidence.find(scoped.query).sort({ createdAt: -1 }).limit(250).lean();
      queryFallbackNote = "No exact matches; answered from scoped evidence.";
    }

    const scopedLabel = scoped.sourceScope === "all" ? "all files"
      : scoped.sourceScope === "file" && scoped.resolvedSourceFile ? `file ${scoped.resolvedSourceFile}`
      : "latest file";

    const answerObj = await generateAnswer({ question, results, scopeLabel: scopedLabel });

    return res.json({
      question,
      interpreter: provider,
      interpreterNote: fallbackReason || queryFallbackNote,
      interpretedFilter: filter,
      sourceScope: scoped.sourceScope,
      sourceFile: scoped.resolvedSourceFile || null,
      summary: `${results.length} record(s) found for: ${question} (${scopedLabel})`,
      answer: answerObj.answer,
      answerProvider: answerObj.provider,
      answerNote: answerObj.note || null,
      count: results.length,
      results
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Query failed" });
  }
}

async function cleanupInvalidRecords(_, res) {
  const result = await Evidence.deleteMany({
    $and: [
      { $or: [{ from: "" }, { from: { $exists: false } }] },
      { $or: [{ to: "" }, { to: { $exists: false } }] },
      { $or: [{ content: "" }, { content: { $exists: false } }] }
    ]
  });
  res.json({ deletedCount: result.deletedCount || 0 });
}

function getQueryExamples(_, res) {
  res.json({ examples: EXAMPLES });
}

async function getQuerySources(_, res) {
  const items = await Evidence.aggregate([
    { $match: { sourceFile: { $nin: [null, ""] } } },
    { $group: { _id: "$sourceFile", count: { $sum: 1 }, latestAt: { $max: "$createdAt" } } },
    { $sort: { latestAt: -1 } },
    { $project: { _id: 0, sourceFile: "$_id", count: 1, latestAt: 1 } }
  ]);
  res.json({ sources: items });
}

module.exports = { queryEvidence, getQueryExamples, getQuerySources, cleanupInvalidRecords };
