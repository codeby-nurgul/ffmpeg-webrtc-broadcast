const path = require("path");
const os = require("os");
require("dotenv").config({ path: path.resolve(__dirname, "../..", ".env") });

const numCores = os.cpus()?.length || 1;

module.exports = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  SSRC: parseInt(process.env.SSRC || "22222222", 10),
  PT: parseInt(process.env.PT || "96", 10),
  ANNOUNCED_IP: process.env.ANNOUNCED_IP || "127.0.0.1",
  INPUT_FILE: path.resolve(__dirname, "../..", process.env.INPUT_FILE || "public/example.mp4"),
  RECORD_DIR: path.resolve(__dirname, "../..", process.env.RECORD_DIR || "backend/recordings"),
  WORKER_PORT_BASE: parseInt(process.env.WORKER_PORT_BASE || "40000", 10),
  WORKERS: Math.max(1, Math.min(parseInt(process.env.WORKERS || `${numCores}`, 10), 8)),
  WEBRTC_BITRATE: 2_000_000,
};
