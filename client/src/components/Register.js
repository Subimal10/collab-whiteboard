// src/components/Register.js
import { useState } from "react";

const Register = () => {
  const [input, setInput] = useState({ username: "", password: "" });

  const handleChange = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.username || !input.password) {
      alert("Please enter both username and password.");
      return;
    }
    const res = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (res.ok) {
      alert("Registration successful! Please log in.");
      window.location.href = "/login";
    } else {
      alert(data.message || "Registration failed.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="username"
        value={input.username}
        onChange={handleChange}
        placeholder="Username"
      />
      <input
        name="password"
        type="password"
        value={input.password}
        onChange={handleChange}
        placeholder="Password"
      />
      <button type="submit">Register</button>
    </form>
  );
};

export default Register;
