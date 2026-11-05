import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./MyRides.css";

function formatDeparture(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata"
  });
}

// Determines which tab a ride belongs to.
function getRideCategory(ride) {
  if (ride.status === "cancelled") return "cancelled";

  if (ride.status === "completed") return "completed";

  // Both open and closed rides remain active.
  return "active";
}

// User-friendly ride status text.
function getRideStatusLabel(ride, category) {
  if (category === "completed") return "Completed";
  if (category === "cancelled") return "Cancelled";
  if (ride.status === "closed") return "Closed";
  if (ride.availableSeats === 0) return "Full";

  return "Open";
}

function MyRides() {
  const [rides, setRides] = useState([]);
  const [activeTab, setActiveTab] = useState("active");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyRideId, setBusyRideId] = useState("");

  const [requestsByRide, setRequestsByRide] = useState({});
  const [selectedReviewRideId, setSelectedReviewRideId] = useState("");

  // Review states
  const [reviewForms, setReviewForms] = useState({});
  const [reviewingRequestId, setReviewingRequestId] = useState("");
  const [busyReviewId, setBusyReviewId] = useState("");
  const [reviewErrors, setReviewErrors] = useState({});
  const [reviewMessages, setReviewMessages] = useState({});

  // Prevent overlapping polling requests.
  const isFetchingRides = useRef(false);

  // Fetch the latest rides from the backend.
  const fetchMyRides = useCallback(async () => {
    if (isFetchingRides.current) return;

    try {
      isFetchingRides.current = true;
      setError("");

      const response = await api.get("/rides/my-rides");
      setRides(response.data.rides || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load your rides. Please try again."
      );
    } finally {
      isFetchingRides.current = false;
      setLoading(false);
    }
  }, []);

  // Initial fetch + automatic refresh every 30 seconds.
  useEffect(() => {
    fetchMyRides();

    const intervalId = setInterval(() => {
      fetchMyRides();
    }, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchMyRides]);

  // Fetch join requests for a particular ride.
  const fetchRideRequests = async (rideId) => {
    setRequestsByRide((previous) => ({
      ...previous,
      [rideId]: {
        requests: [],
        loading: true,
        error: ""
      }
    }));

    try {
      const response = await api.get(`/join-requests/ride/${rideId}`);

      setRequestsByRide((previous) => ({
        ...previous,
        [rideId]: {
          requests: response.data.requests || [],
          loading: false,
          error: ""
        }
      }));
    } catch (err) {
      setRequestsByRide((previous) => ({
        ...previous,
        [rideId]: {
          requests: [],
          loading: false,
          error:
            err.response?.data?.message ||
            "Unable to load travelers for this ride."
        }
      }));
    }
  };

  // Open or close the traveler list.
  const handleToggleReviews = async (ride) => {
    const rideId = ride._id;

    if (selectedReviewRideId === rideId) {
      setSelectedReviewRideId("");
      setReviewingRequestId("");
      return;
    }

    setSelectedReviewRideId(rideId);
    setReviewingRequestId("");

    const existingData = requestsByRide[rideId];

    if (existingData && !existingData.error) {
      return;
    }

    await fetchRideRequests(rideId);
  };

  // Open an individual traveler's review form.
  const openReviewForm = (requestId) => {
    setReviewingRequestId(requestId);

    setReviewForms((previous) => ({
      ...previous,
      [requestId]: {
        rating: 0,
        comment: ""
      }
    }));

    setReviewErrors((previous) => ({
      ...previous,
      [requestId]: ""
    }));
  };

  // Close the individual review form.
  const closeReviewForm = () => {
    setReviewingRequestId("");
  };

  // Update a ride in the current list after an action.
  const updateRideInList = (updatedRide) => {
    setRides((previous) =>
      previous.map((ride) =>
        ride._id === updatedRide._id ? updatedRide : ride
      )
    );
  };

  // Close a ride.
  const handleCloseRide = async (ride) => {
    const confirmed = window.confirm(
      "Are you sure you want to close this ride? No new requests will be accepted."
    );

    if (!confirmed) return;

    try {
      setBusyRideId(ride._id);
      setActionError("");

      const response = await api.patch(`/rides/${ride._id}/close`);
      updateRideInList(response.data.ride);
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
        "Unable to close this ride. Please try again."
      );
    } finally {
      setBusyRideId("");
    }
  };

  // Cancel a ride.
  const handleCancelRide = async (ride) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this ride? All associated requests will be cancelled."
    );

    if (!confirmed) return;

    try {
      setBusyRideId(ride._id);
      setActionError("");

      const response = await api.patch(`/rides/${ride._id}/cancel`);
      updateRideInList(response.data.ride);
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
        "Unable to cancel this ride. Please try again."
      );
    } finally {
      setBusyRideId("");
    }
  };

  // Update an individual traveler's review form.
  const handleReviewFormChange = (requestId, field, value) => {
    setReviewForms((previous) => ({
      ...previous,
      [requestId]: {
        ...previous[requestId],
        [field]: value
      }
    }));

    setReviewErrors((previous) => ({
      ...previous,
      [requestId]: ""
    }));
  };

  // Submit a review for a traveler.
  const handleReviewSubmit = async (ride, request) => {
    const requestId = request._id;
    const rating = reviewForms[requestId]?.rating || 0;
    const comment = reviewForms[requestId]?.comment || "";

    if (rating < 1 || rating > 5) {
      setReviewErrors((previous) => ({
        ...previous,
        [requestId]: "Please select a rating."
      }));
      return;
    }

    if (comment.trim().length > 500) {
      setReviewErrors((previous) => ({
        ...previous,
        [requestId]: "Comment cannot exceed 500 characters."
      }));
      return;
    }

    try {
      setBusyReviewId(requestId);

      setReviewErrors((previous) => ({
        ...previous,
        [requestId]: ""
      }));

      const response = await api.post("/reviews", {
        rideId: ride._id,
        revieweeId: request.traveler._id,
        rating,
        comment: comment.trim()
      });

      setRequestsByRide((previous) => {
        const rideData = previous[ride._id];

        if (!rideData) return previous;

        return {
          ...previous,
          [ride._id]: {
            ...rideData,
            requests: rideData.requests.map((item) =>
              item.traveler?._id === request.traveler._id
                ? { ...item, reviewedByYou: true }
                : item
            )
          }
        };
      });

      const message = response.data.published
        ? "Your review has been published successfully."
        : "Your review has been submitted. It will be published when both participants have reviewed or after 14 days.";

      setReviewMessages((previous) => ({
        ...previous,
        [requestId]: message
      }));

      setReviewingRequestId("");
    } catch (err) {
      if (err.response?.status === 409) {
        setRequestsByRide((previous) => {
          const rideData = previous[ride._id];

          if (!rideData) return previous;

          return {
            ...previous,
            [ride._id]: {
              ...rideData,
              requests: rideData.requests.map((item) =>
                item.traveler?._id === request.traveler._id
                  ? { ...item, reviewedByYou: true }
                  : item
              )
            }
          };
        });

        setReviewMessages((previous) => ({
          ...previous,
          [requestId]: "✓ You have already submitted your review."
        }));

        setReviewingRequestId("");
      } else {
        setReviewErrors((previous) => ({
          ...previous,
          [requestId]:
            err.response?.data?.message ||
            "Unable to submit your review. Please try again."
        }));
      }
    } finally {
      setBusyReviewId("");
    }
  };

  // Separate rides into categories.
  const activeRides = rides.filter(
    (ride) => getRideCategory(ride) === "active"
  );

  const completedRides = rides.filter(
    (ride) => getRideCategory(ride) === "completed"
  );

  const cancelledRides = rides.filter(
    (ride) => getRideCategory(ride) === "cancelled"
  );

  const tabs = [
    { id: "active", label: "Active", count: activeRides.length },
    { id: "completed", label: "Completed", count: completedRides.length },
    { id: "cancelled", label: "Cancelled", count: cancelledRides.length }
  ];

  const filteredRides =
    activeTab === "active"
      ? activeRides
      : activeTab === "completed"
        ? completedRides
        : cancelledRides;

  const emptyMessages = {
    active: {
      title: "No active rides",
      description: "Rides you're currently offering will appear here."
    },
    completed: {
      title: "No completed rides yet",
      description: "Your completed journeys will appear here after departure."
    },
    cancelled: {
      title: "No cancelled rides",
      description: "Rides you've cancelled will appear here."
    }
  };

  if (loading) {
    return (
      <div className="my-rides-state">
        <div className="my-rides-loader"></div>
        <p>Loading your rides...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-rides-state">
        <p>{error}</p>
        <button type="button" onClick={fetchMyRides}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <main className="my-rides-page">
      <div className="my-rides-container">
        {/* Page header */}
        <header className="my-rides-header">
          <div>
            <span className="my-rides-eyebrow">YOUR RIDEMATE ACTIVITY</span>
            <h1>My Rides</h1>
            <p>Keep track of the journeys you've offered.</p>
          </div>

          <div className="my-rides-summary">
            <strong>{rides.length}</strong>
            <span>Total rides</span>
            <small>{activeRides.length} active</small>
          </div>
        </header>

        {actionError && (
          <div className="my-rides-error">{actionError}</div>
        )}

        {/* Ride category tabs */}
        <div className="my-rides-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`my-rides-tab ${
                activeTab === tab.id ? "active" : ""
              }`}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedReviewRideId("");
                setReviewingRequestId("");
              }}
            >
              <span>{tab.label}</span>
              <span className="my-rides-tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Filtered rides */}
        {filteredRides.length === 0 ? (
          <div className="my-rides-empty">
            <h2>{emptyMessages[activeTab].title}</h2>
            <p>{emptyMessages[activeTab].description}</p>

            {activeTab === "active" && (
              <Link to="/rides/create" className="my-rides-create-button">
                Create a Ride
              </Link>
            )}
          </div>
        ) : (
          <section className="my-rides-list">
            {filteredRides.map((ride) => {
              const category = getRideCategory(ride);

              // Management actions are only available for active rides.
              const isActive = category === "active";

              const canEdit =
                isActive &&
                ride.status === "open" &&
                ride.availableSeats === ride.maxSeats;

              const canClose = isActive && ride.status === "open";

              const canCancel =
                isActive &&
                ["open", "closed"].includes(ride.status);

              const rideRequestData = requestsByRide[ride._id];
              const isReviewSectionOpen =
                selectedReviewRideId === ride._id;

              const rideRequests = rideRequestData?.requests || [];

              // Only approved travelers can be reviewed.
             const approvedRequests = rideRequests.filter(
  (request) =>
    ["approved", "completed"].includes(request.status) &&
    request.traveler
);

              return (
                <article className="my-ride-card" key={ride._id}>
                  <div className="my-ride-main">
                    <div className="my-ride-route">
                      <div>
                        <span>FROM</span>
                        <h2>{ride.from}</h2>
                      </div>

                      <span className="my-ride-arrow">→</span>

                      <div>
                        <span>TO</span>
                        <h2>{ride.to}</h2>
                      </div>
                    </div>

                    <div className="my-ride-meta">
                      <span>
                        Departure: {formatDeparture(ride.departureTime)}
                      </span>

                      <span>
                        Seats available: {ride.availableSeats}/{ride.maxSeats}
                      </span>
                    </div>
                  </div>

                  <div className="my-ride-footer">
                    <div className="my-ride-status-wrapper">
                      {category === "completed" && (
                        <span
                          className="my-ride-completed-icon"
                          title="Completed"
                        >
                          ✓
                        </span>
                      )}

                      <span
                        className={`my-ride-status ${
                          category === "completed"
                            ? "completed"
                            : category === "cancelled"
                              ? "cancelled"
                              : ride.status === "closed"
                                ? "closed"
                                : ride.availableSeats === 0
                                  ? "full"
                                  : "open"
                        }`}
                      >
                        {getRideStatusLabel(ride, category)}
                      </span>
                    </div>

                    <div className="my-ride-actions">
                      <Link
                        to={`/rides/${ride._id}`}
                        className="my-ride-view-link"
                      >
                        View Ride
                      </Link>

                      {isActive && (
                        <>
                          {canEdit && (
                            <Link
                              to={`/rides/${ride._id}/edit`}
                              className="my-ride-edit-link"
                            >
                              Edit Ride
                            </Link>
                          )}

                          {canClose && (
                            <button
                              type="button"
                              className="my-ride-close-button"
                              onClick={() => handleCloseRide(ride)}
                              disabled={busyRideId === ride._id}
                            >
                              {busyRideId === ride._id
                                ? "Please wait..."
                                : "Close Ride"}
                            </button>
                          )}

                          {canCancel && (
                            <button
                              type="button"
                              className="my-ride-cancel-button"
                              onClick={() => handleCancelRide(ride)}
                              disabled={busyRideId === ride._id}
                            >
                              {busyRideId === ride._id
                                ? "Please wait..."
                                : "Cancel Ride"}
                            </button>
                          )}

                          <Link
                            to={`/rides/${ride._id}/requests`}
                            className="my-ride-manage-link"
                          >
                            Manage Requests
                          </Link>
                        </>
                      )}

                      {category === "completed" && (
                        <button
                          type="button"
                          className="my-ride-review-toggle"
                          onClick={() => handleToggleReviews(ride)}
                        >
                          {isReviewSectionOpen
                            ? "Hide Travelers"
                            : "Review Travelers"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Traveler review section */}
                  {category === "completed" && isReviewSectionOpen && (
                    <section className="owner-reviews-section">
                      <div className="owner-reviews-heading">
                        <h3>Review your travelers</h3>
                        <p>
                          Share your experience with travelers who joined this ride.
                        </p>
                      </div>

                      {rideRequestData?.loading ? (
                        <p className="owner-review-info">
                          Loading travelers...
                        </p>
                      ) : rideRequestData?.error ? (
                        <div>
                          <p className="owner-review-error">
                            {rideRequestData.error}
                          </p>

                          <button
                            type="button"
                            className="my-ride-review-toggle"
                            onClick={() => fetchRideRequests(ride._id)}
                          >
                            Try Again
                          </button>
                        </div>
                      ) : approvedRequests.length === 0 ? (
                        <p className="owner-review-info">
                          No approved travelers for this ride.
                        </p>
                      ) : (
                        <div className="owner-review-list">
                          {approvedRequests.map((request) => {
                            const traveler = request.traveler;
                            const requestId = request._id;

                            const form = reviewForms[requestId] || {
                              rating: 0,
                              comment: ""
                            };

                            const isReviewFormOpen =
                              reviewingRequestId === requestId;

                            return (
                              <div
                                className="owner-review-card"
                                key={requestId}
                              >
                                <div className="owner-review-traveler">
                                  <div className="owner-review-avatar">
                                    {traveler.profileImage ? (
                                      <img
                                        src={traveler.profileImage}
                                        alt={traveler.name}
                                      />
                                    ) : (
                                      traveler.name?.charAt(0).toUpperCase() || "U"
                                    )}
                                  </div>

                                  <div className="owner-review-traveler-info">
                                    <strong>{traveler.name}</strong>
                                    <span>Approved traveler</span>
                                  </div>
                                </div>

                                {request.reviewedByYou ? (
                                  <div className="owner-review-submitted">
                                    <span>✓</span>
                                    You have already reviewed this traveler.
                                  </div>
                                ) : !isReviewFormOpen ? (
                                  <button
                                    type="button"
                                    className="owner-review-open-button"
                                    onClick={() => openReviewForm(requestId)}
                                  >
                                    ★ Review Traveler
                                  </button>
                                ) : (
                                  <div className="owner-review-form">
                                    <div className="owner-review-form-header">
                                      <h4>Review {traveler.name}</h4>

                                      <button
                                        type="button"
                                        onClick={closeReviewForm}
                                        disabled={busyReviewId === requestId}
                                        aria-label="Close review form"
                                      >
                                        ×
                                      </button>
                                    </div>

                                    <label>Your rating</label>

                                    <div className="owner-review-stars">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                          key={star}
                                          type="button"
                                          className={
                                            star <= form.rating
                                              ? "selected"
                                              : ""
                                          }
                                          onClick={() =>
                                            handleReviewFormChange(
                                              requestId,
                                              "rating",
                                              star
                                            )
                                          }
                                          disabled={busyReviewId === requestId}
                                          aria-label={`Rate ${star} out of 5`}
                                          aria-pressed={form.rating === star}
                                        >
                                          ★
                                        </button>
                                      ))}
                                    </div>

                                    <label htmlFor={`owner-comment-${requestId}`}>
                                      Comment (optional)
                                    </label>

                                    <textarea
                                      id={`owner-comment-${requestId}`}
                                      value={form.comment}
                                      maxLength={500}
                                      rows={3}
                                      placeholder="Share your experience with this traveler..."
                                      onChange={(event) =>
                                        handleReviewFormChange(
                                          requestId,
                                          "comment",
                                          event.target.value
                                        )
                                      }
                                      disabled={busyReviewId === requestId}
                                    />

                                    <div className="owner-review-character-count">
                                      {form.comment.length}/500
                                    </div>

                                    {reviewErrors[requestId] && (
                                      <p className="owner-review-error">
                                        {reviewErrors[requestId]}
                                      </p>
                                    )}

                                    <button
                                      type="button"
                                      className="owner-review-submit-button"
                                      onClick={() =>
                                        handleReviewSubmit(ride, request)
                                      }
                                      disabled={busyReviewId === requestId}
                                    >
                                      {busyReviewId === requestId
                                        ? "Submitting..."
                                        : "Submit Review"}
                                    </button>
                                  </div>
                                )}

                                {reviewMessages[requestId] && (
                                  <p className="owner-review-success">
                                    {reviewMessages[requestId]}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

export default MyRides;