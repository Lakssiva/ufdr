const Evidence = require("../models/Evidence");
const { buildSourceScopedQuery } = require("../utils/sourceScope");
const { extractGeo, resolveCountryCentroid } = require("../utils/geo");
const { generateAnswer } = require("../services/answerService");

async function getDashboard(req, res) {
  try {
    const sourceScope = req.query?.sourceScope || "all";
    const sourceFile = req.query?.sourceFile || "";
    const scoped = await buildSourceScopedQuery(sourceScope, sourceFile);
    const q = scoped.query;
    const [totalRecords, totalChats, totalCalls, totalContacts, foreignCount, cryptoCount, longCalls, distinctContacts, recent] = await Promise.all([
      Evidence.countDocuments(q),
      Evidence.countDocuments({ ...q, type: "chat" }),
      Evidence.countDocuments({ ...q, type: "call" }),
      Evidence.countDocuments({ ...q, type: "contact" }),
      Evidence.countDocuments({ ...q, flags: "FOREIGN" }),
      Evidence.countDocuments({ ...q, flags: "CRYPTO" }),
      Evidence.countDocuments({ ...q, flags: "LONG_CALL" }),
      Evidence.distinct("from", q),
      Evidence.find(q).sort({ createdAt: -1 }).limit(5).lean()
    ]);
    const demoCount = await Evidence.countDocuments({ ...q, isDemoData: true });
    return res.json({
      metrics: { totalRecords, totalChats, totalCalls, totalContacts, foreignCount, cryptoCount, longCalls, uniqueFromContacts: distinctContacts.filter(Boolean).length },
      isDemoData: totalRecords > 0 && demoCount === totalRecords,
      sourceScope: scoped.sourceScope,
      sourceFile: scoped.resolvedSourceFile || null,
      recentActivity: recent.map((item) => ({
        id: item._id,
        title: `${item.type.toUpperCase()} from ${item.from || "Unknown"}`,
        detail: item.content || item.to || "No detail",
        timestamp: item.createdAt,
        sourceFile: item.sourceFile
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Dashboard failed" });
  }
}

async function getLinks(req, res) {
  try {
    const sourceScope = req.query?.sourceScope || "latest";
    const sourceFile = req.query?.sourceFile || "";
    const scoped = await buildSourceScopedQuery(sourceScope, sourceFile);
    const communications = await Evidence.find({ ...scoped.query, type: { $in: ["chat", "call"] } })
      .select("from to flags source metadata").lean();
    const edgeMap = new Map();
    const nodeMap = new Map();
    for (const row of communications) {
      const a = (row.from || "").trim() || `APP:${(row.source || "UFDR").trim()}`;
      const b = (row.to || "").trim() || `APP:${(row.source || "UFDR").trim()}`;
      if (!a || !b || a === b) continue;
      const edgeKey = [a, b].sort().join("::");
      const current = edgeMap.get(edgeKey) || { source: a, target: b, weight: 0, flags: new Set() };
      current.weight += 1;
      (row.flags || []).forEach((f) => current.flags.add(f));
      edgeMap.set(edgeKey, current);
      [a, b].forEach((number) => {
        const isApp = number.startsWith("APP:");
        const node = nodeMap.get(number) || { id: number, label: number.replace("APP:", ""), connections: 0, type: isApp ? "app" : number.startsWith("+") && !number.startsWith("+91") ? "foreign" : "local" };
        node.connections += 1;
        nodeMap.set(number, node);
      });
    }
    const edges = Array.from(edgeMap.values()).map((e) => ({ source: e.source, target: e.target, weight: e.weight, flags: Array.from(e.flags) }));
    const nodes = Array.from(nodeMap.values()).map((n) => ({ ...n, size: Math.max(8, Math.min(42, n.connections * 2)) }));
    return res.json({ nodes, edges, sourceScope: scoped.sourceScope, sourceFile: scoped.resolvedSourceFile || null });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getLocations(req, res) {
  try {
    const sourceScope = req.query?.sourceScope || "latest";
    const sourceFile = req.query?.sourceFile || "";
    const scoped = await buildSourceScopedQuery(sourceScope, sourceFile);
    const records = await Evidence.find(scoped.query).select("country metadata sourceFile type from to lat lon locationPrecision").lean();
    const pointMap = new Map();
    let withGeo = 0, withCountry = 0;
    records.forEach((row) => {
      const directLat = Number.isFinite(row.lat) ? row.lat : null;
      const directLon = Number.isFinite(row.lon) ? row.lon : null;
      const direct = directLat !== null && directLon !== null ? { lat: directLat, lon: directLon } : null;
      const geo = direct || extractGeo(row.metadata);
      let point = null;
      if (geo) { withGeo++; point = { ...geo, precision: row.locationPrecision || geo.precision || "gps" }; }
      else if (row.country) { const c = resolveCountryCentroid(row.country); if (c) { withCountry++; point = { ...c, precision: "country" }; } }
      if (!point) return;
      const key = `${point.lat.toFixed(3)}|${point.lon.toFixed(3)}|${point.precision}`;
      const current = pointMap.get(key) || { id: key, lat: point.lat, lon: point.lon, precision: point.precision, count: 0, examples: [] };
      current.count++;
      if (current.examples.length < 3) current.examples.push({ type: row.type, from: row.from || "", to: row.to || "", sourceFile: row.sourceFile || "" });
      pointMap.set(key, current);
    });
    const points = Array.from(pointMap.values()).sort((a, b) => b.count - a.count);
    return res.json({ points, stats: { totalRecords: records.length, withGeo, withCountry, points: points.length }, sourceScope: scoped.sourceScope, sourceFile: scoped.resolvedSourceFile || null });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getRecentActivity(req, res) {
  const sourceScope = req.query?.sourceScope || "all";
  const sourceFile = req.query?.sourceFile || "";
  const scoped = await buildSourceScopedQuery(sourceScope, sourceFile);
  const recent = await Evidence.find(scoped.query).sort({ createdAt: -1 }).limit(10).lean();
  res.json({ items: recent.map((item) => ({ id: item._id, action: `${item.type.toUpperCase()} analyzed`, subject: item.sourceFile || "UFDR import", createdAt: item.createdAt })) });
}

async function getSuspects(req, res) {
  try {
    const scoped = await buildSourceScopedQuery(req.query?.sourceScope || "all", req.query?.sourceFile || "");
    const records = await Evidence.find(scoped.query).select("from to flags").lean();
    const contactMap = new Map();
    for (const row of records) {
      for (const number of [row.from, row.to].filter(Boolean)) {
        const entry = contactMap.get(number) || { number, totalRecords: 0, flags: new Set() };
        entry.totalRecords++;
        (row.flags || []).forEach((f) => entry.flags.add(f));
        contactMap.set(number, entry);
      }
    }
    const suspects = Array.from(contactMap.values()).map((s) => ({ ...s, flags: Array.from(s.flags) })).sort((a, b) => b.totalRecords - a.totalRecords);
    return res.json({ suspects });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getSuspectProfile(req, res) {
  try {
    const number = req.query?.number || "";
    if (!number) return res.status(400).json({ error: "number is required" });
    const regex = new RegExp(`^${number.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const records = await Evidence.find({ $or: [{ from: regex }, { to: regex }] }).sort({ createdAt: -1 }).limit(100).lean();
    const allFlags = new Set();
    const contactCount = new Map();
    let chats = 0, calls = 0;
    for (const row of records) {
      if (row.type === "chat") chats++;
      if (row.type === "call") calls++;
      (row.flags || []).forEach((f) => allFlags.add(f));
      const other = row.from === number ? row.to : row.from;
      if (other) contactCount.set(other, (contactCount.get(other) || 0) + 1);
    }
    const topContacts = Array.from(contactCount.entries()).map(([n, count]) => ({ number: n, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    return res.json({ number, totalRecords: records.length, chats, calls, flags: Array.from(allFlags), topContacts, records: records.slice(0, 50) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getTimeline(req, res) {
  try {
    const scoped = await buildSourceScopedQuery(req.query?.sourceScope || "latest", req.query?.sourceFile || "");
    const records = await Evidence.find(scoped.query).sort({ timestamp: 1, createdAt: 1 }).limit(300).lean();
    return res.json({ records, sourceScope: scoped.sourceScope, sourceFile: scoped.resolvedSourceFile || null });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getAiSummary(req, res) {
  try {
    const flagged = await Evidence.find({ flags: { $in: ["CRYPTO", "FOREIGN", "LONG_CALL", "SUSPICIOUS"] } }).sort({ createdAt: -1 }).limit(60).lean();
    const result = await generateAnswer({ question: "Provide a concise forensic case summary highlighting the most suspicious patterns, key contacts, and flag types found in this evidence.", results: flagged, scopeLabel: "all flagged evidence" });
    return res.json({ summary: result.answer, provider: result.provider });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function getLocationSampleCsv(_, res) {
  const rows = [
    "type,from,to,timestamp,content,country,lat,lon,source",
    "chat,+91-9000011111,+91-9000099999,2026-02-16T10:00:00Z,Geo ping shared,IN,13.0827,80.2707,WhatsApp",
    "call,+91-9333300000,+971-50-123,2026-02-15T09:45:00Z,International call,AE,25.2048,55.2708,Call Log"
  ];
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=ufdr_geo_sample.csv");
  res.send(rows.join("\n"));
}

module.exports = { getDashboard, getLinks, getRecentActivity, getLocations, getLocationSampleCsv, getSuspects, getSuspectProfile, getTimeline, getAiSummary };
