import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Register from "./components/Register";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import PrivateRoute from "./components/PrivateRoute";
import "./styles/Auth.css";

function Home() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    // Fetch data from backend
    fetch("http://localhost:5000/api/hello")
      .then((res) => res.text())
      .then((data) => setMessage(data))
      .catch(() => setMessage("Could not connect to backend"));
  }, []);

  return (
    <div>
      <h1>Collaborative Whiteboard</h1>
      <p>{message}</p>
    </div>
  );
}

function App() {
  // return <div>Test Render</div>;
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route path="/register" element={<Register />} />
      {/* Add other routes here if needed */}
    </Routes>
  );
}

export default App;
