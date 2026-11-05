
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Notifications.css";

function NotificationIcon({ type }) {
  const commonProps = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true
  };

  switch (type) {
    case "join_requested":
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M19 8v6" />
          <path d="M22 11h-6" />
        </svg>
      );

    case "join_approved":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="10" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      );

    case "join_rejected":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6" />
          <path d="m9 9 6 6" />
        </svg>
      );

    case "ride_updated":
      return (
        <svg {...commonProps}>
          <path d="M20 7v5h-5" />
          <path d="M4 17v-5h5" />
          <path d="M5.6 9a7 7 0 0 1 11.7-2L20 12" />
          <path d="M18.4 15a7 7 0 0 1-11.7 2L4 12" />
        </svg>
      );

    case "ride_cancelled":
      return (
        <svg {...commonProps}>
          <path d="M5 17h14l1-5-2-5H6l-2 5 1 5Z" />
          <path d="M5 12h14" />
          <circle cx="7.5" cy="17" r="1.5" />
          <circle cx="16.5" cy="17" r="1.5" />
          <path d="m9 9 6 3m0-3-6 3" />
        </svg>
      );

    case "traveler_cancelled":
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M16 11h6" />
        </svg>
      );

    default:
      return (
        <svg {...commonProps}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );
  }
}

function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/notifications");

        setNotifications(response.data.notifications || []);
      } catch (err) {
        setError(
          err.response?.data?.message ||
          "Unable to load notifications. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const getNotificationDestination = (notification) => {
    const rideId =
      typeof notification.ride === "object"
        ? notification.ride?._id
        : notification.ride;

    switch (notification.type) {
      case "join_requested":
      case "traveler_cancelled":
        return rideId
          ? `/rides/${rideId}/requests`
          : "/rides/my";

      case "join_approved":
      case "join_rejected":
      case "ride_updated":
      case "ride_cancelled":
        return "/requests/my";

      default:
        return "/notifications";
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await api.patch(
          `/notifications/${notification._id}/read`
        );

        setNotifications((prev) =>
          prev.map((item) =>
            item._id === notification._id
              ? { ...item, isRead: true }
              : item
          )
        );

        window.dispatchEvent(
          new Event("notifications-updated")
        );
      }

      navigate(getNotificationDestination(notification));
    } catch (err) {
      console.error(
        "Failed to process notification:",
        err
      );
    }
  };

  const formatDate = (date) => {
    const notificationDate = new Date(date);
    const now = new Date();

    const difference = now - notificationDate;
    const minutes = Math.floor(difference / 60000);
    const hours = Math.floor(difference / 3600000);
    const days = Math.floor(difference / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;

    return notificationDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="notifications-loading">
          Loading notifications...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notifications-page">
        <div className="notifications-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  return (
    <div className="notifications-page">
      <div className="notifications-container">

        <div className="notifications-header">
          <div>
            <span className="notifications-eyebrow">
              YOUR ACTIVITY
            </span>

            <h1>Notifications</h1>

            <p>
              Stay updated on your rides and requests.
            </p>
          </div>

          {unreadCount > 0 && (
            <div className="notifications-unread-count">
              {unreadCount} unread
            </div>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="notifications-empty">
            <div className="notifications-empty-icon">
              <NotificationIcon type="default" />
            </div>

            <h2>You're all caught up!</h2>

            <p>
              You don't have any notifications yet.
              We'll let you know when something happens.
            </p>

            <button onClick={() => navigate("/rides")}>
              Explore Rides
            </button>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`notification-card ${
                  notification.isRead ? "read" : "unread"
                }`}
                onClick={() =>
                  handleNotificationClick(notification)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();
                    handleNotificationClick(notification);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div
                  className={`notification-icon ${notification.type}`}
                >
                  <NotificationIcon type={notification.type} />
                </div>

                <div className="notification-content">
                  <div className="notification-message">
                    {notification.message}
                  </div>

                  <span className="notification-time">
                    {formatDate(notification.createdAt)}
                  </span>
                </div>

                {!notification.isRead && (
                  <span className="notification-unread-dot"></span>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default Notifications;
