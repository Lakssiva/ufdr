const Evidence = require("../models/Evidence");
const { parseFile } = require("../services/parserService");

async function uploadUfdr(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const records = await parseFile(req.file.path, req.file.originalname);
    if (!records.length) return res.status(400).json({ error: "No records parsed from file" });

    await Evidence.deleteMany({ isDemoData: true });
    const docs = records.map((r) => ({ ...r, sourceFile: req.file.originalname }));
    await Evidence.insertMany(docs);

    return res.json({
      message: "File uploaded and parsed successfully",
      fileName: req.file.originalname,
      ingested: docs.length
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Upload failed" });
  }
}

module.exports = { uploadUfdr };
