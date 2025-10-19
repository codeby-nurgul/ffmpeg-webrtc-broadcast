const router = require("express").Router();
const ctrl = require("../controllers/mediaController");

// Mirrors your previous endpoints, but routed cleanly
router.get("/rtp-capabilities", ctrl.getRtpCapabilities);
router.post("/transport", ctrl.createTransport);
router.post("/transport/connect", ctrl.connectTransport);
router.post("/consume", ctrl.consume);

module.exports = router;
