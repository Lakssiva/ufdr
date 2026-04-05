const express = require("express");
const multer = require("multer");
const path = require("path");
const { uploadUfdr } = require("../controllers/uploadController");
const { queryEvidence, getQueryExamples, getQuerySources, cleanupInvalidRecords } = require("../controllers/queryController");
const { getDashboard, getLinks, getRecentActivity, getLocations, getLocationSampleCsv, getSuspects, getSuspectProfile, getTimeline, getAiSummary } = require("../controllers/dashboardController");
const { getReports, generateReport } = require("../controllers/reportController");

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), "uploads"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

router.post("/upload-ufdr", upload.single("file"), uploadUfdr);
router.post("/query", queryEvidence);
router.get("/query/examples", getQueryExamples);
router.get("/query/sources", getQuerySources);
router.post("/query/cleanup-invalid", cleanupInvalidRecords);
router.get("/dashboard", getDashboard);
router.get("/links", getLinks);
router.get("/activity", getRecentActivity);
router.get("/locations", getLocations);
router.get("/locations/sample-csv", getLocationSampleCsv);
router.get("/suspects", getSuspects);
router.get("/suspects/profile", getSuspectProfile);
router.get("/timeline", getTimeline);
router.post("/dashboard/ai-summary", getAiSummary);
router.get("/reports", getReports);
router.post("/reports/generate", generateReport);

module.exports = router;
