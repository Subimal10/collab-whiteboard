// src/components/Login.js
import { useState } from "react";
import { useAuth } from "../context/AuthProvider";

const Login = () => {
  const [input, setInput] = useState({ username: "", password: "" });
  const { login } = useAuth();

  const handleChange = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.username && input.password) {
      login(input);
    } else {
      alert("Please provide both username and password");
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
      <button type="submit">Login</button>
    </form>
  );
};

export default Login;
