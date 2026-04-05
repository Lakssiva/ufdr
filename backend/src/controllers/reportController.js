const Evidence = require("../models/Evidence");
const { buildSourceScopedQuery } = require("../utils/sourceScope");
const PDFDocument = require("pdfkit");

async function getReports(req, res) {
  try {
    const sourceScope = req.query?.sourceScope || "all";
    const sourceFile = req.query?.sourceFile || "";
    const scoped = await buildSourceScopedQuery(sourceScope, sourceFile);
    const q = scoped.query;
    const [totalRecords, cryptoCount, foreignCount] = await Promise.all([
      Evidence.countDocuments(q),
      Evidence.countDocuments({ ...q, flags: "CRYPTO" }),
      Evidence.countDocuments({ ...q, flags: "FOREIGN" })
    ]);
    return res.json({
      reports: [],
      summary: { totalRecords, cryptoCount, foreignCount }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function generateReport(req, res) {
  try {
    const { template, format, sourceScope, sourceFile } = req.body;
    const scoped = await buildSourceScopedQuery(sourceScope || "all", sourceFile || "");
    const records = await Evidence.find(scoped.query).sort({ createdAt: -1 }).limit(500).lean();

    if (format === "CSV") {
      const headers = "type,from,to,timestamp,content,flags\n";
      const rows = records.map((r) =>
        `${r.type},${r.from || ""},${r.to || ""},${r.timestamp || ""},"${(r.content || "").replace(/"/g, "'")}","${(r.flags || []).join("|")}"`
      ).join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="Investigation_Report.csv"`);
      return res.send(headers + rows);
    }

    // PDF
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Investigation_Report.pdf"`);
    doc.pipe(res);
    doc.fontSize(20).text("UFDR AI Investigation Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Template: ${template || "Full Investigation Report"}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.text(`Total Records: ${records.length}`);
    doc.moveDown();
    records.slice(0, 100).forEach((r, i) => {
      doc.fontSize(10).text(`${i + 1}. [${r.type?.toUpperCase()}] ${r.from || "?"} → ${r.to || "?"} | ${r.timestamp || "-"} | Flags: ${(r.flags || []).join(", ") || "none"}`);
      if (r.content) doc.fontSize(9).text(`   ${r.content.slice(0, 120)}`, { color: "grey" });
    });
    doc.end();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { getReports, generateReport };
