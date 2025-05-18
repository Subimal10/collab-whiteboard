import React, { useEffect, useState } from "react";

function App() {
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

export default App;
