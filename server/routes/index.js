const express = require("express");
const router = express.Router();

router.get("/hello", (req, res) => {
  console.log("Received request for /api/hello");
  res.send("API is running!");
});

module.exports = router;
