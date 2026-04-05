function formatRecord(record) {
  return {
    type: record.type || "",
    from: record.from || "",
    to: record.to || "",
    timestamp: record.timestamp || "",
    content: (record.content || "").slice(0, 180),
    flags: record.flags || [],
    source: record.source || ""
  };
}

function localAnswer(question, results, scopeLabel) {
  if (!results.length) {
    return `No matching evidence found for "${question}" in ${scopeLabel}. Try broader wording like chats, calls, foreign, crypto, or links.`;
  }
  const total = results.length;
  const byType = results.reduce((acc, row) => {
    const key = row.type || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const byFlag = results.reduce((acc, row) => {
    (row.flags || []).forEach((f) => { acc[f] = (acc[f] || 0) + 1; });
    return acc;
  }, {});
  const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
  const topFlag = Object.entries(byFlag).sort((a, b) => b[1] - a[1])[0];
  let sentence = `Found ${total} matching record(s) in ${scopeLabel}`;
  if (topType) sentence += `, mostly ${topType[0]} (${topType[1]})`;
  if (topFlag) sentence += `, with dominant flag ${topFlag[0]} (${topFlag[1]})`;
  sentence += ".";
  return sentence;
}

async function hfAnswer(question, results, scopeLabel) {
  const token = process.env.HF_ACCESS_TOKEN;
  if (!token) return null;
  const preferredModel = process.env.HF_MODEL || "meta-llama/Llama-3.1-8B-Instruct";
  const modelCandidates = [
    preferredModel,
    "meta-llama/Llama-3.1-8B-Instruct",
    "Qwen/Qwen2.5-7B-Instruct",
    "microsoft/Phi-3-mini-4k-instruct"
  ];
  const contextRecords = results.slice(0, 40).map(formatRecord);
  const systemPrompt =
    "You are a forensic investigation assistant. Answer the user's question using only provided evidence context. " +
    "If evidence is insufficient, say that clearly. Keep answer concise (4-7 lines), factual, and include counts where possible.";
  let lastError = null;
  for (const model of modelCandidates) {
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 280,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Question: ${question}\nScope: ${scopeLabel}\nMatch count: ${results.length}\nEvidence JSON: ${JSON.stringify(contextRecords)}` }
        ]
      })
    });
    if (!response.ok) {
      const txt = await response.text();
      lastError = `model=${model} status=${response.status} ${txt.slice(0, 140)}`;
      continue;
    }
    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (answer) return { answer, provider: `huggingface:${model}` };
    lastError = `model=${model} returned empty answer`;
  }
  throw new Error(`HF answer generation failed: ${lastError || "unknown"}`);
}

async function generateAnswer({ question, results, scopeLabel }) {
  try {
    const hf = await hfAnswer(question, results, scopeLabel);
    if (hf) return hf;
  } catch (error) {
    return { answer: localAnswer(question, results, scopeLabel), provider: "rules", note: error.message };
  }
  return { answer: localAnswer(question, results, scopeLabel), provider: "rules" };
}

module.exports = { generateAnswer };
