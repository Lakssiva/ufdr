const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const xml2js = require("xml2js");
const { getFlags } = require("./intelligenceService");

function parseDuration(val) {
  if (!val) return 0;
  const str = String(val);
  // "12m 33s" or "12:33" or plain seconds
  const mMatch = str.match(/(\d+)\s*m/i);
  const sMatch = str.match(/(\d+)\s*s/i);
  if (mMatch || sMatch) {
    return (parseInt(mMatch?.[1] || 0) * 60) + parseInt(sMatch?.[1] || 0);
  }
  const colonMatch = str.match(/^(\d+):(\d+)/);
  if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
  const num = parseFloat(str);
  return isFinite(num) ? num : 0;
}

function guessType(raw) {
  const callType = String(raw.Call_Type || raw.call_type || raw.Type || raw.type || raw.record_type || "").toLowerCase();
  const platform = String(raw.Platform || raw.platform || raw.source || raw.Source || "").toLowerCase();
  const content = String(raw.Message_Excerpt || raw.content || raw.Content || raw.message || raw.body || raw.Activity_Description || "").toLowerCase();

  if (/call/.test(callType) || /call/.test(platform)) return "call";
  if (/chat|whatsapp|telegram|signal|sms|message/.test(platform)) return "chat";
  if (/contact/.test(callType)) return "contact";
  if (/call/.test(content)) return "call";
  if (raw.Duration || raw.duration || raw.durationSeconds) return "call";
  if (raw.Message_Excerpt || raw.Detected_Crypto_Address) return "chat";
  if (raw.Activity_Description) return "chat";
  return "chat";
}

function normalizeRecord(raw, sourceFile) {
  // Resolve "from" field from many possible column names
  const from =
    raw.from || raw.From ||
    raw.source_number || raw.Source_Number || raw.sourceNumber ||
    raw.Contact || raw.contact ||
    raw.Number || raw.number ||
    raw.Sender || raw.sender || "";

  // Resolve "to" field
  const to =
    raw.to || raw.To ||
    raw.target_number || raw.Target_Number || raw.targetNumber ||
    raw.Recipient || raw.recipient || "";

  // Resolve timestamp
  const timestamp =
    raw.timestamp || raw.Timestamp ||
    raw.date || raw.Date ||
    raw.datetime || raw.DateTime || "";

  // Resolve content
  const content =
    raw.content || raw.Content ||
    raw.message || raw.Message ||
    raw.body || raw.Body ||
    raw.Message_Excerpt ||
    raw.Activity_Description ||
    raw.Detected_Crypto_Address || "";

  // Resolve country
  const country =
    raw.country || raw.Country ||
    raw.Country_Code || raw.country_code || "";

  // Resolve source/platform
  const source =
    raw.source || raw.Source ||
    raw.Platform || raw.platform ||
    raw.Call_Type || raw.call_type ||
    sourceFile || "UFDR";

  const type = guessType(raw);

  const durationSeconds = parseDuration(
    raw.durationSeconds || raw.duration_seconds ||
    raw.Duration || raw.duration || ""
  );

  const record = {
    type,
    from: String(from).trim(),
    to: String(to).trim(),
    timestamp: String(timestamp).trim(),
    content: String(content).trim(),
    country: String(country).trim(),
    durationSeconds,
    source: String(source).trim(),
    sourceFile,
    lat: parseFloat(raw.lat || raw.latitude || raw.Latitude || "") || null,
    lon: parseFloat(raw.lon || raw.longitude || raw.Longitude || "") || null,
    metadata: raw
  };

  // Extra: if crypto address column exists, append to content
  if (raw.Detected_Crypto_Address && !record.content.includes(raw.Detected_Crypto_Address)) {
    record.content = `${record.content} ${raw.Detected_Crypto_Address}`.trim();
  }

  // Extra: risk level as suspicious flag
  const risk = String(raw.Risk_Level || raw.risk_level || "").toLowerCase();
  if (risk === "high" || risk === "medium") {
    record.metadata = { ...raw, suspicious_activity: "yes" };
  }

  record.flags = getFlags(record);
  return record;
}

async function parseCSV(filePath, sourceFile) {
  return new Promise((resolve, reject) => {
    const records = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        const r = normalizeRecord(row, sourceFile);
        // skip completely empty rows
        if (r.from || r.to || r.content || r.timestamp) records.push(r);
      })
      .on("end", () => resolve(records))
      .on("error", reject);
  });
}

async function parseJSON(filePath, sourceFile) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const arr = Array.isArray(raw) ? raw : raw.records || raw.data || [raw];
  return arr.map((r) => normalizeRecord(r, sourceFile)).filter((r) => r.from || r.to || r.content);
}

async function parseXML(filePath, sourceFile) {
  const content = fs.readFileSync(filePath, "utf8");
  const result = await xml2js.parseStringPromise(content, { explicitArray: false });
  const root = result[Object.keys(result)[0]];
  const items = root.record || root.records?.record || root.item || root.items?.item || [];
  const arr = Array.isArray(items) ? items : [items];
  return arr.map((r) => normalizeRecord(r, sourceFile)).filter((r) => r.from || r.to || r.content);
}

async function parseXLSX(filePath, sourceFile) {
  const XLSX = require("xlsx");
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return rows.map((r) => normalizeRecord(r, sourceFile)).filter((r) => r.from || r.to || r.content);
}

async function parseFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  // handle double extensions like .csv.xls
  const lower = originalName.toLowerCase();
  const sourceFile = originalName;

  if (lower.endsWith(".csv.xls") || lower.endsWith(".csv.xlsx")) return parseCSV(filePath, sourceFile);
  if (ext === ".csv") return parseCSV(filePath, sourceFile);
  if (ext === ".json") return parseJSON(filePath, sourceFile);
  if (ext === ".xml") return parseXML(filePath, sourceFile);
  if (ext === ".xlsx" || ext === ".xls") return parseXLSX(filePath, sourceFile);
  throw new Error(`Unsupported file type: ${ext}`);
}

module.exports = { parseFile };
