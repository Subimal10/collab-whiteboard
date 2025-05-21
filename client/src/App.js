// src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import Register from "./components/Register";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import PrivateRoute from "./components/PrivateRoute";
import Home from "./components/Home";
import Navbar from "./components/Navbar"; // <-- Import Navbar
import Whiteboard from "./components/Whiteboard";
import "./styles/Auth.css";

function App() {
  return (
    <div>
      <Navbar /> {/* <-- Add Navbar here */}
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
        <Route path="/whiteboard" element={<Whiteboard />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </div>
  );
}

export default App;
