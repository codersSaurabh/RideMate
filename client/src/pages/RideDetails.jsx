
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./RideDetails.css";

function RideDetails() {
  const { id } = useParams();
  const { user } = useAuth();

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");
  const [joinError, setJoinError] = useState("");

  const handleJoinRide = async () => {
    try {
      setJoining(true);
      setJoinMessage("");
      setJoinError("");

      const response = await api.post(
        `/join-requests/${id}/join`
      );

      setJoinMessage(response.data.message);
    } catch (error) {
      setJoinError(
        error.response?.data?.message ||
          "Unable to send join request. Please try again."
      );
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    const fetchRide = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/rides/${id}`);
        setRide(response.data.ride);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to fetch ride details."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRide();
  }, [id]);

  const departure = ride
    ? new Date(ride.departureTime)
    : null;

  const isOwner =
    user && ride?.owner?._id === user._id;

  const rideJoinable =
    !isOwner &&
    ride?.status === "open" &&
    ride?.availableSeats > 0 &&
    departure &&
    departure > new Date(Date.now() + 30 * 60 * 1000);

  // Profile should not be clickable for completed or cancelled rides
  const isProfileClickable =
    ride?.status !== "completed" &&
    ride?.status !== "cancelled";

  if (loading) {
    return (
      <div className="ride-details-state">
        <div className="ride-loader"></div>
        <p>Loading ride details...</p>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="ride-details-state">
        <h2>Ride not found</h2>
        <p>
          {error || "This ride may no longer be available."}
        </p>

        <Link to="/rides" className="details-back-link">
          Explore other rides
        </Link>
      </div>
    );
  }

  return (
    <main className="ride-details-page">
      <div className="ride-details-container">
        <Link to="/rides" className="details-back-link">
          ← Back to rides
        </Link>

        <div className="ride-details-header">
          <div>
            <span className="details-eyebrow">
              RIDE OVERVIEW
            </span>

            <h1>Your journey, made easier.</h1>

            <p>
              Review the ride information before connecting.
            </p>
          </div>

          <span className={`ride-status ${ride.status}`}>
            {ride.status}
          </span>
        </div>

        <section className="ride-details-card">
          <div className="details-route">
            <div className="details-location">
              <span className="location-dot start-dot"></span>

              <div>
                <span>FROM</span>
                <h2>{ride.from}</h2>
              </div>
            </div>

            <div className="route-connector"></div>

            <div className="details-location">
              <span className="location-dot end-dot"></span>

              <div>
                <span>TO</span>
                <h2>{ride.to}</h2>
              </div>
            </div>
          </div>

          <div className="details-divider"></div>

          <div className="details-info-grid">
            <div className="details-info-item">
              <span>DEPARTURE DATE</span>

              <strong>
                {departure.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "Asia/Kolkata",
                })}
              </strong>
            </div>

            <div className="details-info-item">
              <span>DEPARTURE TIME</span>

              <strong>
                {departure.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                  timeZone: "Asia/Kolkata",
                })}
              </strong>
            </div>

            <div className="details-info-item">
              <span>AVAILABLE SEATS</span>

              <strong>
                {ride.availableSeats} of {ride.maxSeats}
              </strong>
            </div>
          </div>

          <div className="details-divider"></div>

          {/* Owner profile section */}
          {isProfileClickable ? (
            <Link
              to={`/users/${ride.owner?._id}?rideId=${ride._id}`}
              className="ride-owner-section owner-profile-link"
            >
              <div className="owner-avatar">
                {ride.owner?.profileImage ? (
                  <img
                    src={ride.owner.profileImage}
                    alt={ride.owner.name}
                  />
                ) : (
                  ride.owner?.name?.charAt(0).toUpperCase() || "U"
                )}
              </div>

              <div className="owner-information">
                <span>RIDE ORGANIZED BY</span>

                <strong>
                  {ride.owner?.name || "RideMate member"}
                </strong>
              </div>

              <span className="owner-profile-arrow">→</span>
            </Link>
          ) : (
            <div className="ride-owner-section">
              <div className="owner-avatar">
                {ride.owner?.profileImage ? (
                  <img
                    src={ride.owner.profileImage}
                    alt={ride.owner.name}
                  />
                ) : (
                  ride.owner?.name?.charAt(0).toUpperCase() || "U"
                )}
              </div>

              <div className="owner-information">
                <span>RIDE ORGANIZED BY</span>

                <strong>
                  {ride.owner?.name || "RideMate member"}
                </strong>
              </div>
            </div>
          )}
        </section>

        <section className="ride-details-action">
          {isOwner ? (
            <p>
              This is your ride. You can manage it from My Rides.
            </p>
          ) : rideJoinable ? (
            user ? (
              <>
                <button
                  className="join-ride-button"
                  onClick={handleJoinRide}
                  disabled={joining}
                >
                  {joining ? "Sending Request..." : "Join This Ride"}
                </button>

                {joinMessage && (
                  <p className="join-success">{joinMessage}</p>
                )}

                {joinError && (
                  <p className="join-error">{joinError}</p>
                )}
              </>
            ) : (
              <Link to="/login" className="join-ride-button">
                Login to Join
              </Link>
            )
          ) : (
            <p className="join-unavailable">
              {ride.availableSeats === 0
                ? "This ride is currently full."
                : ride.status !== "open"
                  ? "This ride is no longer accepting requests."
                  : "Joining is unavailable for this departure time."}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

export default RideDetails;
