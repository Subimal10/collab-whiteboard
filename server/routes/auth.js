// server/routes/auth.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authenticationController");

// Registration route
router.post("/register", authController.register);

// Login route
router.post("/login", authController.login);

// Logout route
router.post("/logout", authController.logout);

module.exports = router;
