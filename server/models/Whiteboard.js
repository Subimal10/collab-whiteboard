// server/models/Whiteboard.js
const mongoose = require("mongoose");

const WhiteboardSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  updated: {
    type: Date,
    default: Date.now,
  },
});

// Auto-update timestamp on update
WhiteboardSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updated: Date.now() });
  next();
});
WhiteboardSchema.pre("save", function (next) {
  this.updated = Date.now();
  next();
});

module.exports = mongoose.model("Whiteboard", WhiteboardSchema);
