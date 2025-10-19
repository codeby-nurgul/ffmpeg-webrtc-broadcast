const mediasoup = require("mediasoup");
const path = require("path");
const {
  SSRC, PT, INPUT_FILE, RECORD_DIR, ANNOUNCED_IP,
  WORKER_PORT_BASE, WORKERS, WEBRTC_BITRATE
} = require("../config/env");
const createUdpReceiver = require("../services/udpReceiver");
const startRecording = require("../services/recording");

const workers = [];
const routers = [];
let nextRouterIdx = 0;

const recvTransports = new Map(); // transportId -> { transport, router }
const pipeProducerByRouterId = new Map(); // router.id -> producer/pipeProducer

let ingestRouter = null;
let udpProducer = null;

const routerMediaCodecs = [
  {
    kind: "video",
    mimeType: "video/H264",
    clockRate: 90000,
    parameters: {
      "packetization-mode": 1,
      "profile-level-id": "42e01f",
      "level-asymmetry-allowed": 1,
    },
    rtcpFeedback: [
      { type: "nack" },
      { type: "nack", parameter: "pli" },
      { type: "ccm", parameter: "fir" },
      { type: "transport-cc" },
    ],
  },
];

const webRtcTransportOpts = {
  listenIps: [{ ip: "0.0.0.0", announcedIp: ANNOUNCED_IP }],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
  initialAvailableOutgoingBitrate: WEBRTC_BITRATE,
  enableSctp: false,
};

function pickRouterRoundRobin() {
  const r = routers[nextRouterIdx];
  nextRouterIdx = (nextRouterIdx + 1) % routers.length;
  return r;
}

async function createWorkersAndRouters() {
  for (let i = 0; i < WORKERS; i++) {
    const worker = await mediasoup.createWorker({
      rtcMinPort: WORKER_PORT_BASE + i * 1000,
      rtcMaxPort: WORKER_PORT_BASE + i * 1000 + 999,
      logLevel: "warn",
    });
    worker.on("died", () => {
      console.error("❌ mediasoup worker died. Exiting...");
      process.exit(1);
    });
    workers.push(worker);
    const router = await worker.createRouter({ mediaCodecs: routerMediaCodecs });
    routers.push(router);
  }
  console.log(`✅ ${workers.length} worker / ${routers.length} router ready`);
}

async function ensurePipes(sourceRouter, producer) {
  pipeProducerByRouterId.set(sourceRouter.id, producer);
  for (const r of routers) {
    if (r.id === sourceRouter.id) continue;
    const { pipeProducer } = await sourceRouter.pipeToRouter({
      producerId: producer.id,
      router: r,
    });
    pipeProducerByRouterId.set(r.id, pipeProducer);
  }
  console.log("🔗 Pipes ready (producer mirrored to all routers)");
}

async function initMedia() {
  await createWorkersAndRouters();

  // UDP ingest on the first router
  ingestRouter = routers[0];
  const { producer, rtpPort, rtcpPort } = await createUdpReceiver({
    router: ingestRouter,
    ssrc: SSRC,
    pt: PT,
  });
  udpProducer = producer;
  console.log(`🎯 ingest RTP=${rtpPort} RTCP=${rtcpPort} @router=${ingestRouter.id}`);

  // Start FFmpeg tee: send RTP + record to file
  startRecording({
    inputFile: INPUT_FILE,
    rtpPort,
    rtcpPort,
    ssrc: SSRC,
    pt: PT,
    recordDir: RECORD_DIR,
  });

  // Make stream available on all routers (for load distribution)
  await ensurePipes(ingestRouter, udpProducer);
}

async function createWebRtcTransport() {
  const router = pickRouterRoundRobin();
  const t = await router.createWebRtcTransport(webRtcTransportOpts);
  recvTransports.set(t.id, { transport: t, router });
  return {
    transport: t,
    response: {
      id: t.id,
      iceParameters: t.iceParameters,
      iceCandidates: t.iceCandidates,
      dtlsParameters: t.dtlsParameters,
    },
  };
}

async function connectTransport(transportId, dtlsParameters) {
  const entry = recvTransports.get(transportId);
  if (!entry) throw new Error("transport not found");
  await entry.transport.connect({ dtlsParameters });
}

async function consume(transportId, rtpCapabilities) {
  const entry = recvTransports.get(transportId);
  if (!entry) throw new Error("transport not found");

  const router = entry.router;
  const targetProducer = pipeProducerByRouterId.get(router.id);
  if (!targetProducer) throw new Error("pipeProducer not available");
  if (!router.canConsume({ producerId: targetProducer.id, rtpCapabilities })) {
    throw new Error("Incompatible rtpCapabilities");
  }

  const consumer = await entry.transport.consume({
    producerId: targetProducer.id,
    rtpCapabilities,
    paused: false,
  });

  return {
    id: consumer.id,
    producerId: targetProducer.id,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
  };
}

async function shutdown() {
  try { await udpProducer?.close(); } catch {}
  for (const r of routers) { try { await r.close(); } catch {} }
  for (const w of workers) { try { await w.close(); } catch {} }
}

function getRtpCapabilities() {
  return ingestRouter?.rtpCapabilities || { codecs: [], headerExtensions: [] };
}

module.exports = {
  initMedia,
  createWebRtcTransport,
  connectTransport,
  consume,
  getRtpCapabilities,
  shutdown,
};
