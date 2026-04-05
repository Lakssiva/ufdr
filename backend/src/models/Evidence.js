const mongoose = require("mongoose");

const EvidenceSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["chat", "call", "contact"], required: true },
    from: String,
    to: String,
    timestamp: String,
    content: String,
    country: String,
    durationSeconds: Number,
    source: String,
    sourceFile: String,
    lat: Number,
    lon: Number,
    locationPrecision: String,
    flags: [String],
    metadata: mongoose.Schema.Types.Mixed,
    isDemoData: { type: Boolean, default: false }
  },
  { timestamps: true }
);

EvidenceSchema.index({ type: 1 });
EvidenceSchema.index({ flags: 1 });
EvidenceSchema.index({ from: 1, to: 1 });
EvidenceSchema.index({ content: "text" });

module.exports = mongoose.model("Evidence", EvidenceSchema);
