// src/components/Login.js
import { useState } from "react";
import { useAuth } from "../context/AuthProvider";

const Login = () => {
  const [input, setInput] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const { login } = useAuth();

  const validate = () => {
    if (!input.identifier || !input.password) {
      setError("All fields are required.");
      return false;
    }
    setError("");
    return true;
  };

  const handleChange = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await login(input); // login handles errors internally or throws
    } catch (err) {
      setError(err.message || "Login failed.");
    }
  };

  return (
    <div className="auth-form">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="identifier"
          placeholder="Username or Email"
          value={input.identifier}
          onChange={handleChange}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={input.password}
          onChange={handleChange}
        />
        <button type="submit">Login</button>
      </form>
      {error && <p className="auth-error">{error}</p>}
    </div>
  );
};

export default Login;
