const media = require("../core/media");

// Thin HTTP layer; all heavy lifting is in core/media
exports.getRtpCapabilities = (_req, res) => {
  res.json(media.getRtpCapabilities());
};

exports.createTransport = async (_req, res) => {
  try {
    const { response } = await media.createWebRtcTransport();
    res.json(response);
  } catch (err) {
    console.error("transport error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
};

exports.connectTransport = async (req, res) => {
  try {
    const { transportId, dtlsParameters } = req.body || {};
    await media.connectTransport(transportId, dtlsParameters);
    res.json({ ok: true });
  } catch (err) {
    console.error("connect error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
};

exports.consume = async (req, res) => {
  try {
    const { transportId, rtpCapabilities } = req.body || {};
    const payload = await media.consume(transportId, rtpCapabilities);
    res.json(payload);
  } catch (err) {
    console.error("consume error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
};
