
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./FindRides.css";

function FindRides() {
  const [formData, setFormData] = useState({
    from: "",
    to: "",
    date: ""
  });

  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRides = async (params = {}) => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/rides", {
        params
      });

      setRides(response.data.rides || []);
    } catch (err) {
      setRides([]);
      setError(
        err.response?.data?.message ||
        "Unable to fetch rides. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();

    const params = {};

    if (formData.from.trim()) {
      params.from = formData.from.trim();
    }

    if (formData.to.trim()) {
      params.to = formData.to.trim();
    }

    if (formData.date) {
      params.date = formData.date;
    }

    fetchRides(params);
  };

  const handleReset = () => {
    const emptyForm = {
      from: "",
      to: "",
      date: ""
    };

    setFormData(emptyForm);
    fetchRides();
  };

  const formatDeparture = (departureTime) => {
    return new Date(departureTime).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata"
    });
  };

  return (
    <main className="find-rides-page">
      <section className="find-rides-hero">
        <div className="find-rides-heading">
          <span className="find-rides-eyebrow">
            DISCOVER YOUR JOURNEY
          </span>

          <h1>
            Find a ride.
            <span> Travel together.</span>
          </h1>

          <p>
            Find fellow travellers heading in the same
            direction and make your journey easier.
          </p>
        </div>

        <form
          className="ride-search-form"
          onSubmit={handleSearch}
        >
          <div className="search-field">
            <label htmlFor="from">FROM</label>
            <input
              id="from"
              type="text"
              name="from"
              placeholder="Enter starting location"
              value={formData.from}
              onChange={handleChange}
            />
          </div>

          <div className="search-field">
            <label htmlFor="to">TO</label>
            <input
              id="to"
              type="text"
              name="to"
              placeholder="Enter destination"
              value={formData.to}
              onChange={handleChange}
            />
          </div>

          <div className="search-field">
            <label htmlFor="date">TRAVEL DATE</label>
            <input
              id="date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
            />
          </div>

          <div className="search-actions">
            <button type="submit" className="search-button">
              Search Rides
            </button>

            <button
              type="button"
              className="reset-button"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="available-rides-section">
        <div className="rides-section-heading">
          <div>
            <span className="find-rides-eyebrow">
              YOUR NEXT JOURNEY
            </span>
            <h2>Available rides</h2>
          </div>

          {!loading && (
            <span className="ride-count">
              {rides.length} {rides.length === 1 ? "ride" : "rides"} found
            </span>
          )}
        </div>

        {loading && (
          <div className="rides-message">
            <div className="rides-loader"></div>
            <p>Finding available rides...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rides-message rides-error">
            <p>{error}</p>
            <button onClick={() => fetchRides()}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && rides.length === 0 && (
          <div className="rides-empty">
            <div className="empty-icon">⌕</div>
            <h3>No rides found</h3>
            <p>
              We couldn't find any matching rides.
              Try changing your search or check again later.
            </p>
            <button onClick={handleReset}>
              Clear search
            </button>
          </div>
        )}

        {!loading && !error && rides.length > 0 && (
          <div className="rides-list">
            {rides.map((ride) => (
              <article className="ride-card" key={ride._id}>
                <div className="ride-card-main">
                  <div className="ride-route">
                    <div className="route-point">
                      <span className="route-dot"></span>
                      <div>
                        <span className="route-label">FROM</span>
                        <h3>{ride.from}</h3>
                      </div>
                    </div>

                    <div className="route-line"></div>

                    <div className="route-point">
                      <span className="route-dot destination-dot"></span>
                      <div>
                        <span className="route-label">TO</span>
                        <h3>{ride.to}</h3>
                      </div>
                    </div>
                  </div>

                  <div className="ride-details">
                    <div className="ride-detail-item">
                      <span>DEPARTURE</span>
                      <strong>
                        {formatDeparture(ride.departureTime)}
                      </strong>
                    </div>

                    <div className="ride-detail-item">
                      <span>AVAILABLE SEATS</span>
                      <strong>
                        {ride.availableSeats}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="ride-card-footer">
                  <div className="ride-owner">
                    {ride.owner?.profileImage ? (
                      <img
                        src={ride.owner.profileImage}
                        alt={ride.owner.name || "Ride owner"}
                      />
                    ) : (
                      <div className="owner-avatar">
                        {ride.owner?.name?.charAt(0)?.toUpperCase() || "R"}
                      </div>
                    )}

                    <div>
                      <span>OFFERED BY</span>
                      <strong>
                        {ride.owner?.name || "Ride owner"}
                      </strong>
                    </div>
                  </div>

                  <Link
                    to={`/rides/${ride._id}`}
                    className="ride-details-link"
                  >
                    View Details <span>→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default FindRides;
