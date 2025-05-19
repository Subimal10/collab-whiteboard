// src/components/Register.js
import { useState } from "react";

const Register = () => {
  const [input, setInput] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validate = () => {
    if (!input.username || !input.email || !input.password) {
      setError("All fields are required.");
      return false;
    }
    if (input.username.length < 3) {
      setError("Username must be at least 3 characters.");
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(input.username)) {
      setError("Username can only contain letters, numbers, and underscores.");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(input.email)) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (input.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    setError("");
    return true;
  };

  const handleChange = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Registration successful! You can now log in.");
        setInput({ username: "", email: "", password: "" });
      } else {
        setError(data.message || "Registration failed.");
      }
    } catch {
      setError("Could not connect to server.");
    }
  };

  return (
    <div className="auth-form">
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="username"
          placeholder="Username"
          value={input.username}
          onChange={handleChange}
        />
        <input
          name="email"
          placeholder="Email"
          value={input.email}
          onChange={handleChange}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={input.password}
          onChange={handleChange}
        />
        <button type="submit">Register</button>
      </form>
      {error && <p className="auth-error">{error}</p>}
      {success && <p className="auth-success">{success}</p>}
    </div>
  );
};

export default Register;
