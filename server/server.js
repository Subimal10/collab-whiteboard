// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

// wrap express in a native http server
const server = http.createServer(app);

// attach socket.io to that server
const io = new Server(server, {
  cors: { origin: "*" }, // in prod lock this down to your client URL
});

io.on("connection", (socket) => {
  console.log("🔌 socket connected:", socket.id);

  // join-room → socket joins that “roomId”
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`→ ${socket.id} joined room ${roomId}`);
  });

  // drawing → payload can be { line }, { shape }, { text }, { image }…
  socket.on("drawing", (data) => {
    const { roomId, ...payload } = data;
    // send to everyone _except_ the sender in that room
    socket.to(roomId).emit("drawing", payload);
  });

  // clear-canvas → simply tell everyone else to clear
  socket.on("clear-canvas", (roomId) => {
    socket.to(roomId).emit("clear-canvas");
  });

  // rebroadcast full canvas state on undo/redo
  socket.on("sync-state", ({ roomId, lines, shapes, texts, images }) => {
    socket.to(roomId).emit("sync-state", { lines, shapes, texts, images });
  });

  socket.on("disconnecting", () => {
    console.log("🔌 socket disconnecting:", socket.id);
  });
});

// your existing REST routes
const authRoutes = require("./routes/auth");
const indexRoutes = require("./routes/index");
const whiteboardRoutes = require("./routes/whiteboard");

app.use("/api/auth", authRoutes);
app.use("/api", indexRoutes);
app.use("/api/whiteboard", whiteboardRoutes);

const PORT = process.env.PORT || 5000;
mongoose
  .connect(
    process.env.MONGO_URI || "mongodb://localhost:27017/collab_whiteboard"
  )
  .then(() => {
    // ← **IMPORTANT**: listen on `server`, not `app`
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error:", err));
