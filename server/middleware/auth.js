// server/middleware/auth.js
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  // 1) Read the Bearer token from the Authorization header
  const auth = req.header("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing auth token" });
  }

  try {
    // 2) Verify & decode
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // 3) Expose user info
    req.user = { id: payload.id, username: payload.username };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
