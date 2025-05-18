const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require("./routes/auth");
const indexRoutes = require("./routes/index");

app.use("/api/auth", authRoutes);
app.use("/api", indexRoutes);

const PORT = process.env.PORT || 5000;
mongoose
  .connect(
    process.env.MONGO_URI || "mongodb://localhost:27017/collab_whiteboard"
  )
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error:", err));
