
import { useState } from "react";
import { Link,useNavigate } from "react-router-dom";
import api from "../services/api";
import "./auth.css";

function Signup() {
  const navigate=useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: ""
  });

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Allow only 10 digits in the phone number field.
    const updatedValue =
      name === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value;

    setFormData((prev) => ({
      ...prev,
      [name]: updatedValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsSuccess(false);
    setIsLoading(true);

    try {
      const response = await api.post("/auth/signup", formData);

      setMessage(response.data.message || "Account created successfully.");
      setIsSuccess(true);

      setFormData({
        name: "",
        email: "",
        phone: "",
        password: ""
      });
      navigate("/login");
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Unable to create your account."
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
            Already have an account?
            <Link to="/login">Log in</Link>
          </p>
        </header>

        <div className="auth-content">
          <div className="auth-heading">
            <span className="auth-eyebrow">YOUR JOURNEY STARTS HERE</span>
            <h1>Create your account</h1>
            <p>Join RideMate and make your journey easier.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </div>

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
              <label htmlFor="phone">Mobile number</label>
              <input
                id="phone"
                type="tel"
                name="phone"
                placeholder="Enter your 10-digit mobile number"
                value={formData.phone}
                onChange={handleChange}
                autoComplete="tel-national"
                inputMode="numeric"
                maxLength={10}
                pattern="[6-9][0-9]{9}"
                title="Enter a valid 10-digit Indian mobile number"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <button
              className="auth-submit"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create account"}
              {!isLoading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          {message && (
            <p
              className={`auth-message ${isSuccess ? "success" : "error"}`}
              role="status"
            >
              {message}
            </p>
          )}

          <p className="auth-mobile-footer">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>

        <footer className="auth-bottom">
          Travel together. Make every journey better.
        </footer>
      </section>

      <aside className="auth-visual">
        <div className="auth-visual-overlay" />

        <div className="auth-visual-content">
          <span className="visual-label">THE SMARTER WAY TO TRAVEL</span>

          <h2>
            Ride Together.
            <span>Go Further.</span>
          </h2>

          <p>
            Find rides, share journeys,
            <br />
            and travel hassle-free with RideMate.
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

export default Signup;
