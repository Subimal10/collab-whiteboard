// server/controllers/whiteboardController.js
const Whiteboard = require("../models/Whiteboard");

exports.listBoards = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const docs = await Whiteboard.find({ owner: ownerId })
      .select("roomId updated")
      .sort({ updated: -1 });
    res.json({ boards: docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Load an existing board
exports.loadBoard = async (req, res) => {
  try {
    const { roomId } = req.params;
    const doc = await Whiteboard.findOne({ roomId });
    if (!doc) return res.json({ data: null });
    res.json({ data: doc.data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Save or update board state
exports.saveBoard = async (req, res) => {
  try {
    const { roomId } = req.params;
    const payload = req.body; // { lines, shapes, texts, images }
    const ownerId = req.user.id; // from your auth middleware

    await Whiteboard.findOneAndUpdate(
      { roomId },
      { data: payload, owner: ownerId, updated: Date.now() },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
