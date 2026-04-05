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
    raw["Contact/Number"] || raw["Contact_or_Number"] ||
    raw.name_or_number || raw.Name_or_Number ||
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
    raw.message_content || raw.Message_Content ||
    raw.body || raw.Body ||
    raw.Message_Excerpt ||
    raw.Description || raw.description ||
    raw.Activity_Description ||
    raw.URL || raw.url || raw.url_shared ||
    raw.Detected_Crypto_Address ||
    raw.Crypto_Address || raw.crypto_address || "";

  // Resolve country
  const country =
    raw.country || raw.Country ||
    raw.Country_Code || raw.country_code || "";

  // Resolve source/platform
  const source =
    raw.source || raw.Source ||
    raw.Platform || raw.platform ||
    raw["Platform/Type"] || raw["Platform_or_CallType"] ||
    raw.Call_Type || raw.call_type ||
    sourceFile || "UFDR";

  // Record_Type / Category column maps to type
  const recordType = String(
    raw.Record_Type || raw.record_type ||
    raw.Category || raw.category || ""
  ).toLowerCase();

  const type = recordType.includes("call") || recordType.includes("long_call") || recordType.includes("foreign_comm") && (raw.Duration || raw.duration)
    ? "call"
    : recordType.includes("contact")
    ? "contact"
    : recordType.includes("chat") || recordType.includes("crypto_chat") || recordType.includes("shared_url") || recordType.includes("suspicious")
    ? "chat"
    : guessType(raw);

  // duration_minutes column (ufdr_supported_records_dataset)
  const durationSeconds = raw.duration_minutes
    ? parseFloat(raw.duration_minutes) * 60
    : parseDuration(
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

  // Append any crypto address columns to content so flags fire
  const cryptoVal = raw.Detected_Crypto_Address || raw.Crypto_Address || raw.crypto_address || raw.url_shared || raw.URL || "";
  if (cryptoVal && !record.content.includes(cryptoVal)) {
    record.content = `${record.content} ${cryptoVal}`.trim();
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
    // peek first line to detect if file has headers
    const firstLine = fs.readFileSync(filePath, "utf8").split("\n")[0] || "";
    const hasHeaders = /[a-zA-Z_]/.test(firstLine.split(",")[0]);

    const options = hasHeaders ? {} : {
      headers: ["type","from","country","source","timestamp","duration_minutes","content","crypto_address","url_shared","to","case_id","device_id"]
    };

    fs.createReadStream(filePath)
      .pipe(csv(options))
      .on("data", (row) => {
        // merge crypto_address and url_shared into content if present
        if (row.crypto_address) row.content = `${row.content || ""} ${row.crypto_address}`.trim();
        if (row.url_shared) row.content = `${row.content || ""} ${row.url_shared}`.trim();
        const r = normalizeRecord(row, sourceFile);
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
