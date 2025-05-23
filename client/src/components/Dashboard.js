// src/components/Dashboard.js
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthProvider";
import { Link, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import "../styles/Dashboard.css";

const Dashboard = () => {
  const { user, token, logout } = useAuth();
  const [boards, setBoards] = useState([]);
  const navigate = useNavigate();

  // Fetch list of boards on mount
  useEffect(() => {
    fetch("http://localhost:5000/api/whiteboard", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch boards");
        return res.json();
      })
      .then((data) => {
        setBoards(data.boards || []);
      })
      .catch((err) => console.error(err));
  }, [token]);

  // Create a new board
  const handleNewBoard = () => {
    const newId = uuidv4();
    navigate(`/whiteboard/${newId}`);
  };

  return (
    <div className="dashboard">
      <h2>Welcome, {user?.username || user?.email}!</h2>
      <button onClick={logout}>Logout</button>

      <section className="dashboard-boards">
        <h3>Your Boards</h3>
        <button className="new-board-btn" onClick={handleNewBoard}>
          + New Board
        </button>
        {boards.length === 0 ? (
          <p>No boards yet. Click “New Board” to get started!</p>
        ) : (
          <ul>
            {boards.map(({ roomId, updated }) => (
              <li key={roomId}>
                <Link to={`/whiteboard/${roomId}`}>{roomId}</Link>
                <small>
                  {" "}
                  — last updated{" "}
                  {new Date(updated).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
