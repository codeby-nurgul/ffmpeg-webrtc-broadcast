const statusDiv = document.getElementById("status");
const startButton = document.getElementById("startButton");
const videoElement = document.getElementById("videoElement");
const multiBtn = document.getElementById("multiBtn");
const nInput = document.getElementById("nInput");
const grid = document.getElementById("grid");

function setStatus(msg) {
  if (statusDiv) statusDiv.textContent = "Durum: " + msg;
  console.log("[viewer]", msg);
}
startButton?.addEventListener("click", () => createViewer(videoElement));
multiBtn?.addEventListener("click", async () => {
  const n = Math.max(1, Math.min(12, Number(nInput.value || 1)));
  grid.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const v = document.createElement("video");
    v.autoplay = true;
    v.playsInline = true;
    v.muted = true;
    v.style.background = "#000";
    v.style.borderRadius = "8px";
    grid.appendChild(v);
    createViewer(v).catch((e) => console.error("viewer failed", e));
  }
});

async function createViewer(targetVideo) {
  try {
    setStatus("Bağlanıyor...");
    if (!window.mediasoupClient)
      throw new Error("mediasoup client yüklenemedi");

    const device = new mediasoupClient.Device();
    const rtpCaps = await fetch("/api/rtp-capabilities").then((r) => r.json());
    await device.load({ routerRtpCapabilities: rtpCaps });

    const tInfo = await fetch("/api/transport", { method: "POST" }).then((r) =>
      r.json()
    );
    const transport = device.createRecvTransport(tInfo);

    // BAĞLANTI: handler kur, ama bekleme!
    transport.on("connect", async ({ dtlsParameters }, cb, eb) => {
      try {
        await fetch("/api/transport/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transportId: transport.id, dtlsParameters }),
        });
        cb();
      } catch (e) {
        eb(e);
      }
    });
    transport.on("connectionstatechange", (s) => setStatus("Transport: " + s));

    // ÜRETİCİYİ TÜKET
    const info = await consumeWithRetry(transport, device, 12, 500);
    const consumer = await transport.consume({
      id: info.id,
      producerId: info.producerId,
      kind: info.kind,
      rtpParameters: info.rtpParameters,
    });
    try {
      await consumer.resume();
    } catch {}

    const stream = new MediaStream([consumer.track]);
    targetVideo.srcObject = stream;
    await safePlay(targetVideo);
    setStatus("Yayın oynuyor");
  } catch (e) {
    console.error(e);
    setStatus("Hata - " + e.message);
  }
}

async function consumeWithRetry(transport, device, tries, waitMs) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch("/api/consume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transportId: transport.id,
        rtpCapabilities: device.rtpCapabilities,
      }),
    }).then((r) => r.json());
    if (res && !res.error) return res;
    if (res && String(res.error || "").includes("producer")) {
      await delay(waitMs);
      continue;
    }
    throw new Error(res && res.error ? res.error : "consume başarısız");
  }
  throw new Error("producer bulunamadı");
}

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
async function safePlay(v) {
  try {
    await v.play();
  } catch {
    await delay(200);
    try {
      await v.play();
    } catch {}
  }
}
