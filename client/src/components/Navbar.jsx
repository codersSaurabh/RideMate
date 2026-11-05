
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./navbar.css";

function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const response = await api.get("/notifications");
        setUnreadCount(response.data.unreadCount || 0);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchUnreadCount();

    // Allow the Notifications page to refresh the badge.
    window.addEventListener(
      "notifications-updated",
      fetchUnreadCount
    );

    return () => {
      window.removeEventListener(
        "notifications-updated",
        fetchUnreadCount
      );
    };
  }, [user, location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      setMenuOpen(false);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) return null;

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand" onClick={closeMenu}>
        RideMate<span>.</span>
      </Link>

      <button
        className="navbar-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle navigation"
        aria-expanded={menuOpen}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav className={`navbar-menu ${menuOpen ? "active" : ""}`}>
        <NavLink to="/" end onClick={closeMenu}>
          Home
        </NavLink>

        <NavLink to="/rides" onClick={closeMenu}>
          Find Rides
        </NavLink>

        {user ? (
          <>
            <NavLink to="/rides/create" onClick={closeMenu}>
              Offer a Ride
            </NavLink>

            <NavLink to="/rides/my" onClick={closeMenu}>
              My Rides
            </NavLink>

            <Link to="/requests/my" onClick={closeMenu}>
              My Requests
            </Link>

            <NavLink
              to="/notifications"
              className="navbar-notification"
              onClick={closeMenu}
              aria-label={`Notifications, ${unreadCount} unread`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>

              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </NavLink>

            <NavLink
  to={`/users/${user._id || user.id}`}
  onClick={closeMenu}
>
  Profile
</NavLink>

            <button
              className="navbar-logout"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" onClick={closeMenu}>
              Login
            </NavLink>

            <Link
              to="/signup"
              className="navbar-signup"
              onClick={closeMenu}
            >
              Get Started
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
