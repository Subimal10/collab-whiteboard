import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { v4 as uuidv4 } from "uuid";
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

  // Close menu on any keypress outside navbar
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
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

  // generate a fresh room each time
  const newRoomId = uuidv4();

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
            onClick={() => setIsOpen(false)}
            className={({ isActive }) => (isActive ? "nav-active" : undefined)}
          >
            Home
          </NavLink>
        </li>

        {user ? (
          <>
            <li>
              <NavLink
                to="/dashboard"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  isActive ? "nav-active" : undefined
                }
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
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  isActive ? "nav-active" : undefined
                }
              >
                Login
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/register"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  isActive ? "nav-active" : undefined
                }
              >
                Register
              </NavLink>
            </li>
            <li>
              {/* NOTE: we include a fresh UUID each time */}
              <NavLink
                to={`/whiteboard/${newRoomId}`}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  isActive ? "nav-active" : undefined
                }
              >
                Whiteboard
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
      {isOpen && (
        <div className="navbar-backdrop" onClick={() => setIsOpen(false)} />
      )}
    </nav>
  );
};

export default Navbar;
