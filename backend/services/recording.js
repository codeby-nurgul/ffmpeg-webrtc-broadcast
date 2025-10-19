// Spawns FFmpeg once and tees H264 to (1) RTP (2) .ts recording
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs");
const path = require("path");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

/**
 * Start FFmpeg: INPUT -> tee to RTP (mediasoup PlainTransport) + MPEG-TS file
 */
module.exports = function startRecording({ inputFile, rtpPort, rtcpPort, ssrc, pt, recordDir, outputFile }) {
  if (!fs.existsSync(inputFile)) {
    console.error("Input file not found:", inputFile);
  }
  ensureDir(recordDir);
  const outPath = outputFile || path.join(recordDir, `rec_${ts()}.ts`);

  // NOTE: the tee arg is one string; Node's spawn keeps it intact cross-plat.
  const teeArg =
    `[select=v:f=rtp:ssrc=${ssrc}:payload_type=${pt}]rtp://127.0.0.1:${rtpPort}?rtcpport=${rtcpPort}&pkt_size=1200` +
    `|[select=v:f=mpegts]${outPath}`;

  const args = [
    "-re", "-stream_loop", "-1", "-i", inputFile,
    "-an", "-dn", "-sn",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-tune", "zerolatency",
    "-profile:v", "baseline",
    "-level", "3.1",
    "-pix_fmt", "yuv420p",
    "-crf", "23",
    "-g", "30", "-keyint_min", "30", "-sc_threshold", "0",
    "-map", "0:v:0",
    "-f", "tee",
    teeArg,
  ];

  const ff = spawn(ffmpegPath || "ffmpeg", args, { windowsHide: true });
  ff.stdout.on("data", (d) => process.stdout.write(`[ffmpeg] ${d}`));
  ff.stderr.on("data", (d) => process.stdout.write(`[ffmpeg] ${d}`));
  ff.on("close", (c) => console.log("FFmpeg exited:", c));
  console.log(`▶️ FFmpeg → RTP(${rtpPort}/${rtcpPort}) + record: ${outPath}`);

  return { ff, outPath };
};
