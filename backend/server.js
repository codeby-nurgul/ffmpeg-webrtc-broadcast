const http = require("http");
const app = require("./app");
const { PORT } = require("./config/env");
const media = require("./core/media");

const server = http.createServer(app);

(async () => {
  // Init mediasoup workers/routers + UDP ingest + FFmpeg tee
  await media.initMedia();

  server.listen(PORT, () => {
    console.log(`🌐 http://localhost:${PORT}`);
  });
})().catch((e) => {
  console.error("init error", e);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  try {
    await media.shutdown();
  } catch {}
  process.exit(0);
});
