// server/routes/whiteboard.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/whiteboardcontroller.js");
const auth = require("../middleware/auth"); // your JWT check

// list all boards
router.get("/", auth, ctrl.listBoards);

//load or save a specific board
router.get("/:roomId", auth, ctrl.loadBoard);
router.post("/:roomId", auth, ctrl.saveBoard);

module.exports = router;
