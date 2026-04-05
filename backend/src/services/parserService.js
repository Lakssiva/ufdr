const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const xml2js = require("xml2js");
const { getFlags } = require("./intelligenceService");

function normalizeRecord(raw, source) {
  const type = (raw.type || raw.Type || raw.record_type || "chat").toLowerCase();
  const validTypes = ["chat", "call", "contact"];
  const record = {
    type: validTypes.includes(type) ? type : "chat",
    from: raw.from || raw.From || raw.source_number || raw.Source_Number || raw.sourceNumber || "",
    to: raw.to || raw.To || raw.target_number || raw.Target_Number || raw.targetNumber || "",
    timestamp: raw.timestamp || raw.Timestamp || raw.date || raw.Date || "",
    content: raw.content || raw.Content || raw.message || raw.Message || raw.body || "",
    country: raw.country || raw.Country || "",
    durationSeconds: Number(raw.durationSeconds || raw.duration_seconds || raw.Duration || 0) || 0,
    source: raw.source || raw.Source || raw.platform || source || "UFDR",
    lat: parseFloat(raw.lat || raw.latitude || "") || null,
    lon: parseFloat(raw.lon || raw.longitude || "") || null,
    metadata: raw
  };
  record.flags = getFlags(record);
  return record;
}

async function parseCSV(filePath, sourceFile) {
  return new Promise((resolve, reject) => {
    const records = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => records.push(normalizeRecord(row, sourceFile)))
      .on("end", () => resolve(records))
      .on("error", reject);
  });
}

async function parseJSON(filePath, sourceFile) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const arr = Array.isArray(raw) ? raw : raw.records || raw.data || [raw];
  return arr.map((r) => normalizeRecord(r, sourceFile));
}

async function parseXML(filePath, sourceFile) {
  const content = fs.readFileSync(filePath, "utf8");
  const result = await xml2js.parseStringPromise(content, { explicitArray: false });
  const root = result[Object.keys(result)[0]];
  const items = root.record || root.records?.record || root.item || root.items?.item || [];
  const arr = Array.isArray(items) ? items : [items];
  return arr.map((r) => normalizeRecord(r, sourceFile));
}

async function parseXLSX(filePath, sourceFile) {
  const XLSX = require("xlsx");
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);
  return rows.map((r) => normalizeRecord(r, sourceFile));
}

async function parseFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const sourceFile = originalName;
  if (ext === ".csv") return parseCSV(filePath, sourceFile);
  if (ext === ".json") return parseJSON(filePath, sourceFile);
  if (ext === ".xml") return parseXML(filePath, sourceFile);
  if (ext === ".xlsx" || ext === ".xls") return parseXLSX(filePath, sourceFile);
  throw new Error(`Unsupported file type: ${ext}`);
}

module.exports = { parseFile };
