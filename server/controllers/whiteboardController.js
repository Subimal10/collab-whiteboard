// server/controllers/whiteboardController.js
const Whiteboard = require("../models/Whiteboard");

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
    await Whiteboard.findOneAndUpdate(
      { roomId },
      { data: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
