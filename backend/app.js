const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());

// Serve frontend; adjust path if needed
app.use(express.static(path.join(__dirname, "..", "frontend")));

// API
const mediaRoutes = require("./routes/mediaRoutes");
app.use("/api", mediaRoutes);

module.exports = app;
