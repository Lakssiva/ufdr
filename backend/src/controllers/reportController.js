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
    const q = scoped.query;

    // Each template fetches different data
    let records = [];
    if (template === "Executive Summary") {
      records = await Evidence.find({ ...q, flags: { $exists: true, $not: { $size: 0 } } }).sort({ createdAt: -1 }).limit(50).lean();
    } else if (template === "Evidence List Only") {
      records = await Evidence.find(q).select("type from to timestamp flags sourceFile").sort({ timestamp: 1 }).limit(500).lean();
    } else if (template === "Link Analysis Report") {
      records = await Evidence.find({ ...q, type: { $in: ["call", "chat"] } }).select("type from to timestamp flags content").sort({ createdAt: -1 }).limit(500).lean();
    } else {
      // Full Investigation Report
      records = await Evidence.find(q).sort({ createdAt: -1 }).limit(500).lean();
    }

    const [totalRecords, cryptoCount, foreignCount, longCallCount] = await Promise.all([
      Evidence.countDocuments(q),
      Evidence.countDocuments({ ...q, flags: "CRYPTO" }),
      Evidence.countDocuments({ ...q, flags: "FOREIGN" }),
      Evidence.countDocuments({ ...q, flags: "LONG_CALL" })
    ]);

    if (format === "CSV") {
      let headers, rows;
      if (template === "Evidence List Only") {
        headers = "type,from,to,timestamp,flags,sourceFile\n";
        rows = records.map((r) => `${r.type},${r.from || ""},${r.to || ""},${r.timestamp || ""},"${(r.flags || []).join("|")}",${r.sourceFile || ""}`);
      } else if (template === "Link Analysis Report") {
        headers = "from,to,type,timestamp,flags,content\n";
        rows = records.map((r) => `${r.from || ""},${r.to || ""},${r.type},${r.timestamp || ""},"${(r.flags || []).join("|")}","${(r.content || "").replace(/"/g, "'")}"`);
      } else if (template === "Executive Summary") {
        headers = "type,from,to,timestamp,flags\n";
        rows = records.map((r) => `${r.type},${r.from || ""},${r.to || ""},${r.timestamp || ""},"${(r.flags || []).join("|")}"`);
      } else {
        headers = "type,from,to,timestamp,content,flags,sourceFile\n";
        rows = records.map((r) => `${r.type},${r.from || ""},${r.to || ""},${r.timestamp || ""},"${(r.content || "").replace(/"/g, "'")}","${(r.flags || []).join("|")}",${r.sourceFile || ""}`);
      }
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${template.replace(/\s+/g, "_")}.csv"`);
      return res.send(headers + rows.join("\n"));
    }

    // PDF
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${template.replace(/\s+/g, "_")}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).text(template, { align: "center" });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()} | Scope: ${scoped.resolvedSourceFile || sourceScope || "all"}`, { align: "center" });
    doc.moveDown();

    if (template === "Executive Summary") {
      doc.fontSize(14).text("Case Statistics");
      doc.moveDown(0.5);
      doc.fontSize(11).text(`Total Evidence Records: ${totalRecords}`);
      doc.text(`Crypto-Flagged: ${cryptoCount}`);
      doc.text(`Foreign Communications: ${foreignCount}`);
      doc.text(`Long Calls (>10 min): ${longCallCount}`);
      doc.moveDown();
      doc.fontSize(14).text("Top Flagged Evidence");
      doc.moveDown(0.5);
      records.forEach((r, i) => {
        doc.fontSize(10).text(`${i + 1}. [${r.type?.toUpperCase()}] ${r.from || "?"} → ${r.to || "?"} | Flags: ${(r.flags || []).join(", ") || "none"}`);
      });

    } else if (template === "Evidence List Only") {
      doc.fontSize(14).text(`Total Records: ${records.length}`);
      doc.moveDown(0.5);
      records.forEach((r, i) => {
        doc.fontSize(9).text(`${i + 1}. [${r.type?.toUpperCase()}] ${r.from || "?"} → ${r.to || "?"} | ${r.timestamp || "-"} | ${r.sourceFile || ""}`);
      });

    } else if (template === "Link Analysis Report") {
      // Build contact frequency map
      const contactMap = new Map();
      for (const r of records) {
        for (const num of [r.from, r.to].filter(Boolean)) {
          const e = contactMap.get(num) || { count: 0, flags: new Set() };
          e.count++;
          (r.flags || []).forEach((f) => e.flags.add(f));
          contactMap.set(num, e);
        }
      }
      const topContacts = [...contactMap.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 20);
      doc.fontSize(14).text("Communication Summary");
      doc.fontSize(11).text(`Total call/chat records: ${records.length}`);
      doc.text(`Foreign communications: ${foreignCount}`);
      doc.moveDown();
      doc.fontSize(14).text("Top Communicating Contacts");
      doc.moveDown(0.5);
      topContacts.forEach(([num, data], i) => {
        doc.fontSize(10).text(`${i + 1}. ${num} — ${data.count} interaction(s) | Flags: ${[...data.flags].join(", ") || "none"}`);
      });
      doc.moveDown();
      doc.fontSize(14).text("Recent Communications");
      doc.moveDown(0.5);
      records.slice(0, 80).forEach((r, i) => {
        doc.fontSize(9).text(`${i + 1}. [${r.type?.toUpperCase()}] ${r.from || "?"} → ${r.to || "?"} | ${r.timestamp || "-"} | Flags: ${(r.flags || []).join(", ") || "none"}`);
      });

    } else {
      // Full Investigation Report
      doc.fontSize(14).text("Case Statistics");
      doc.moveDown(0.5);
      doc.fontSize(11).text(`Total Evidence Records: ${totalRecords}`);
      doc.text(`Crypto-Flagged: ${cryptoCount}`);
      doc.text(`Foreign Communications: ${foreignCount}`);
      doc.text(`Long Calls (>10 min): ${longCallCount}`);
      doc.moveDown();
      doc.fontSize(14).text("Full Evidence Log");
      doc.moveDown(0.5);
      records.slice(0, 300).forEach((r, i) => {
        doc.fontSize(10).text(`${i + 1}. [${r.type?.toUpperCase()}] ${r.from || "?"} → ${r.to || "?"} | ${r.timestamp || "-"} | Flags: ${(r.flags || []).join(", ") || "none"}`);
        if (r.content) doc.fontSize(9).text(`   ${r.content.slice(0, 120)}`);
      });
    }

    doc.end();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { getReports, generateReport };
