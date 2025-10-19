// Creates a PlainTransport and produces H264 via RTP/RTCP (non-muxed)
module.exports = async function createUdpReceiver({ router, ssrc, pt }) {
  const transport = await router.createPlainTransport({
    listenIp: { ip: "127.0.0.1" },
    comedia: true,
    rtcpMux: false,
  });

  const rtpPort = transport.tuple.localPort;
  const rtcpPort = transport.rtcpTuple.localPort;

  const producer = await transport.produce({
    kind: "video",
    rtpParameters: {
      codecs: [
        {
          mimeType: "video/H264",
          clockRate: 90000,
          payloadType: pt,
          parameters: {
            "packetization-mode": 1,
            "profile-level-id": "42e01f",
            "level-asymmetry-allowed": 1,
          },
        },
      ],
      encodings: [{ ssrc }],
    },
  });

  return { transport, producer, rtpPort, rtcpPort };
};
