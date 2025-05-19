const User = require("../models/User");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// Register Controller
exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const user = new User({ username, email, password });
    await user.save();
    res.json({ message: "User registered successfully" });
  } catch (err) {
    // Duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `The ${field} is already taken` });
    }
    // Validation error
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(500).json({ message: "Registration failed" });
  }
};

// Login Controller (accepts username or email)
exports.login = async (req, res) => {
  const { identifier, password } = req.body; // identifier = username or email
  if (!identifier || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ user: { username: user.username, email: user.email }, token });
  } catch (err) {
    res.status(500).json({ message: "Login failed" });
  }
};

// Logout Controller (stateless for JWT)
exports.logout = (req, res) => {
  res.json({ message: "Logged out" });
};
