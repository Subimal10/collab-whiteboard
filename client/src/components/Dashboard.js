// src/components/Dashboard.js

import React from "react";
import { useAuth } from "../context/AuthProvider";

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard">
      <h2>Welcome, {user?.username || user?.email}!</h2>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

// const Dashboard = () => {
//   const { user, logout } = useAuth
//     ? useAuth()
//     : { user: null, logout: () => {} };

//   return (
//     <div>
//       <h2>Dashboard</h2>
//       {user ? (
//         <p>Welcome, {user.username || user.email || "User"}!</p>
//       ) : (
//         <p>Welcome to your dashboard!</p>
//       )}
//       <button onClick={logout}>Logout</button>
//     </div>
//   );
// };

export default Dashboard;
