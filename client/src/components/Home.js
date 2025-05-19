// src/components/Home.js
import { Link } from "react-router-dom";
import "../styles/Home.css";

const Home = () => (
  <div className="home-hero">
    <header className="home-header">
      <h1>
        <span className="brand-primary">Collaborative</span>
        <span className="brand-secondary">Whiteboard</span>
      </h1>
      <p className="home-tagline">
        Brainstorm, draw, and collaborate in real time.
        <br />
        Share ideas visually with your team-anywhere, anytime.
      </p>
      <div className="home-actions">
        <Link to="/login" className="home-btn home-btn-primary">
          Login
        </Link>
        <Link to="/register" className="home-btn home-btn-secondary">
          Register
        </Link>
      </div>
    </header>
    <section className="home-features">
      <div className="feature-card">
        <img src="/assets/real-time.svg" alt="Real-time collaboration" />
        <h3>Real-time Collaboration</h3>
        <p>See everyone’s changes live as you work together on the board.</p>
      </div>
      <div className="feature-card">
        <img src="/assets/drawing-tools.svg" alt="Drawing tools" />
        <h3>Powerful Drawing Tools</h3>
        <p>Draw, annotate, and sketch with pens, shapes, colors, and more.</p>
      </div>
      <div className="feature-card">
        <img src="/assets/secure.svg" alt="Secure and private" />
        <h3>Secure & Private</h3>
        <p>Your boards are protected and accessible only to your team.</p>
      </div>
    </section>
    <footer className="home-footer">
      <p>
        &copy; {new Date().getFullYear()} Collaborative Whiteboard &mdash; Built
        for teams and creators.
      </p>
    </footer>
  </div>
);

export default Home;
