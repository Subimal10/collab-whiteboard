import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import "../styles/Navbar.css";

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navbarRef = useRef(null);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close menu on typing outside the navbar
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // If focus is inside the navbar, do nothing
      if (
        navbarRef.current &&
        navbarRef.current.contains(document.activeElement)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <nav className="navbar" ref={navbarRef}>
      <div className="navbar-brand">
        <NavLink to="/" onClick={() => setIsOpen(false)}>
          Collaborative Whiteboard
        </NavLink>
      </div>
      <ul className={`navbar-links ${isOpen ? "active" : ""}`}>
        <li>
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? "nav-active" : undefined)}
            onClick={() => setIsOpen(false)}
          >
            Home
          </NavLink>
        </li>
        {user ? (
          <>
            <li>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  isActive ? "nav-active" : undefined
                }
                onClick={() => setIsOpen(false)}
              >
                Dashboard
              </NavLink>
            </li>
            <li>
              <button
                className="logout-btn"
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
              >
                Logout
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  isActive ? "nav-active" : undefined
                }
                onClick={() => setIsOpen(false)}
              >
                Login
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/register"
                className={({ isActive }) =>
                  isActive ? "nav-active" : undefined
                }
                onClick={() => setIsOpen(false)}
              >
                Register
              </NavLink>
            </li>
          </>
        )}
      </ul>
      <button
        className={`navbar-toggle ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      {/* Backdrop for closing menu on outside click */}
      {isOpen && (
        <div className="navbar-backdrop" onClick={() => setIsOpen(false)} />
      )}
    </nav>
  );
};

export default Navbar;
