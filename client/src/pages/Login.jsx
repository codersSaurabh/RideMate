import "./auth.css";
import { useState } from "react";
import { Link,useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


function Login() {
  const { login } = useAuth();
 
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const navigate=useNavigate();

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const response = await login(formData);
       navigate(`/`);
     
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Login failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-form-panel">
        <header className="auth-topbar">
          <Link to="/" className="auth-brand">
            Ride<span>Mate</span>
          </Link>

          <p>
            New to RideMate?
            <Link to="/signup">Create account</Link>
          </p>
        </header>

        <div className="auth-content">
          <div className="auth-heading">
            <span className="auth-eyebrow">
              WELCOME BACK
            </span>

            <h1>Login to RideMate</h1>

            <p>
              Sign in to find rides and continue your journey.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="email">Email address</label>

              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>

              <input
                id="password"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              className="auth-submit"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
              {!isLoading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          {message && (
            <p
              className={`auth-message ${
                message.toLowerCase().includes("successful")
                  ? "success"
                  : "error"
              }`}
              role="status"
            >
              {message}
            </p>
          )}

          <p className="auth-mobile-footer">
            New to RideMate? <Link to="/signup">Create account</Link>
          </p>
        </div>

        <footer className="auth-bottom">
          Travel together. Make every journey better.
        </footer>
      </section>

      <aside className="auth-visual">
        <div className="auth-visual-overlay" />

        <div className="auth-visual-content">
          <span className="visual-label">
            YOUR NEXT JOURNEY AWAITS
          </span>

          <h2>
            Welcome Back.
            <span>Let's Ride.</span>
          </h2>

          <p>
            Connect with fellow travelers,
            <br />
            discover rides and travel together.
          </p>
        </div>

        <div className="auth-benefits">
          <div>
            <span>↗</span>
            <p>Share Rides</p>
          </div>

          <div>
            <span>✓</span>
            <p>Travel Safe</p>
          </div>

          <div>
            <span>₹</span>
            <p>Save Money</p>
          </div>
        </div>
      </aside>
    </main>
  );
}

export default Login;
