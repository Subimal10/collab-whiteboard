// server/routes/whiteboard.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/whiteboardcontroller.js");

router.get("/:roomId", ctrl.loadBoard);
router.post("/:roomId", ctrl.saveBoard);

module.exports = router;
