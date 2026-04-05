const mongoose = require("mongoose");

async function connectDB(uri) {
  await mongoose.connect(uri);
  console.log("MongoDB connected");
}

module.exports = { connectDB };
