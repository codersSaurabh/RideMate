
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./MyRequests.css";

function formatDate(value) {
  if (!value) return "Date unavailable";

  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata"
  });
}

// Determines which tab a request belongs to.
function getRequestCategory(request) {
  const { status, ride } = request;

  if (status === "pending") {
    return "active";
  }

  if (status === "approved") {
    const departureTime = ride?.departureTime
      ? new Date(ride.departureTime).getTime()
      : null;

    if (departureTime && departureTime <= Date.now()) {
      return "completed";
    }

    return "active";
  }

  if (status === "completed") {
    return "completed";
  }

  return "history";
}

// User-friendly status text.
function getStatusLabel(request) {
  const { status } = request;

  if (status === "pending") return "Pending";

  if (status === "approved") {
    return getRequestCategory(request) === "completed"
      ? "Completed"
      : "Confirmed";
  }

  if (status === "completed") return "Completed";
  if (status === "approved_cancelled") return "Cancelled";
  if (status === "ride_cancelled") return "Ride Cancelled";
  if (status === "cancelled") return "Cancelled";
  if (status === "rejected") return "Rejected";

  return status;
}

// Traveler can review the owner only after
// the request status becomes completed.
function canReviewOwner(request) {
  return (
    request.status === "completed" &&
    request.ride &&
    request.ride.status === "completed" &&
    Boolean(request.ride.owner?._id)
  );
}

function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("active");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [processingId, setProcessingId] = useState("");

  // Review states
  const [reviewingId, setReviewingId] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [reviewProcessing, setReviewProcessing] = useState(false);

  // Fetch traveler requests.
  const fetchMyRequests = async () => {
    try {
      setError("");

      const response = await api.get("/join-requests/my-requests");

      setRequests(response.data.requests || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load your requests. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  // Cancel a join request.
  const handleCancelRequest = async (requestId) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this join request?"
    );

    if (!confirmed) return;

    try {
      setProcessingId(requestId);
      setActionError("");

      await api.patch(`/join-requests/${requestId}/cancel`);

      await fetchMyRequests();
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
        "Unable to cancel your request. Please try again."
      );
    } finally {
      setProcessingId("");
    }
  };

  // Open review form.
  const openReviewForm = (requestId) => {
    setReviewingId(requestId);
    setReviewRating(0);
    setReviewComment("");
    setReviewError("");
    setReviewSuccess("");
  };

  // Close review form.
  const closeReviewForm = () => {
    setReviewingId("");
    setReviewRating(0);
    setReviewComment("");
    setReviewError("");
  };

  // Submit review for ride owner.
  const handleSubmitReview = async (request) => {
    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError("Please select a rating.");
      return;
    }

    if (!request.ride?._id || !request.ride?.owner?._id) {
      setReviewError("Ride owner information is unavailable.");
      return;
    }

    try {
      setReviewProcessing(true);
      setReviewError("");

      const response = await api.post("/reviews", {
        rideId: request.ride._id,
        revieweeId: request.ride.owner._id,
        rating: reviewRating,
        comment: reviewComment.trim()
      });

      // Persist submitted status in current UI.
      setRequests((previous) =>
        previous.map((item) =>
          item._id === request._id
            ? { ...item, reviewedByYou: true }
            : item
        )
      );

      setReviewSuccess(
        response.data.published
          ? "Review submitted. Both reviews are now published."
          : "Review submitted! It will remain hidden until the other participant reviews or 14 days pass."
      );

      setReviewingId("");
      setReviewRating(0);
      setReviewComment("");

    } catch (err) {
      if (err.response?.status === 409) {
        // Review already exists in database.
        setRequests((previous) =>
          previous.map((item) =>
            item._id === request._id
              ? { ...item, reviewedByYou: true }
              : item
          )
        );

        setReviewSuccess("✓ You have already submitted your review.");
        setReviewingId("");
        setReviewError("");

      } else {
        setReviewError(
          err.response?.data?.message ||
          "Unable to submit your review. Please try again."
        );
      }
    } finally {
      setReviewProcessing(false);
    }
  };

  // Filter requests into three categories.
  const activeRequests = requests.filter(
    (request) => getRequestCategory(request) === "active"
  );

  const completedRequests = requests.filter(
    (request) => getRequestCategory(request) === "completed"
  );

  const historyRequests = requests.filter(
    (request) => getRequestCategory(request) === "history"
  );

  const tabs = [
    {
      id: "active",
      label: "Active",
      count: activeRequests.length
    },
    {
      id: "completed",
      label: "Completed",
      count: completedRequests.length
    },
    {
      id: "history",
      label: "Cancelled / Rejected",
      count: historyRequests.length
    }
  ];

  const filteredRequests =
    activeTab === "active"
      ? activeRequests
      : activeTab === "completed"
        ? completedRequests
        : historyRequests;

  const emptyMessages = {
    active: {
      title: "No active requests",
      description:
        "Your pending and confirmed ride requests will appear here."
    },
    completed: {
      title: "No completed rides yet",
      description:
        "Your completed rides will appear here after departure."
    },
    history: {
      title: "No cancelled or rejected requests",
      description:
        "Your cancelled and rejected requests will appear here."
    }
  };

  if (loading) {
    return (
      <div className="my-requests-state">
        <div className="my-requests-loader"></div>
        <p>Loading your requests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-requests-state">
        <p>{error}</p>
        <button onClick={fetchMyRequests}>Try Again</button>
      </div>
    );
  }

  return (
    <main className="my-requests-page">
      <div className="my-requests-container">

        {/* Page header */}
        <header className="my-requests-header">
          <div>
            <span className="my-requests-eyebrow">
              YOUR RIDEMATE ACTIVITY
            </span>

            <h1>My Requests</h1>

            <p>
              Track your active, completed and past ride requests.
            </p>
          </div>

          <div className="my-requests-summary">
            <strong>{requests.length}</strong>
            <span>Total requests</span>
            <small>{activeRequests.length} active</small>
          </div>
        </header>

        {actionError && (
          <div className="my-requests-error">
            {actionError}
          </div>
        )}

        {/* Request category tabs */}
        <div className="my-requests-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`my-requests-tab ${
                activeTab === tab.id ? "active" : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>

              <span className="my-requests-tab-count">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filtered requests */}
        {filteredRequests.length === 0 ? (
          <div className="my-requests-empty">
            <h2>{emptyMessages[activeTab].title}</h2>

            <p>{emptyMessages[activeTab].description}</p>

            {activeTab === "active" && (
              <Link
                to="/rides"
                className="my-requests-browse-button"
              >
                Find Rides
              </Link>
            )}
          </div>
        ) : (
          <section className="my-requests-list">
            {filteredRequests.map((request) => {
              const ride = request.ride;
              const category = getRequestCategory(request);

              const canCancel =
                category === "active" &&
                ["pending", "approved"].includes(request.status);

              const canReview = canReviewOwner(request);

              return (
                <article
                  className="my-request-card"
                  key={request._id}
                >
                  <div className="my-request-main">

                    {/* Route */}
                    <div className="my-request-route">
                      <div>
                        <span>FROM</span>
                        <h2>{ride?.from || "Ride unavailable"}</h2>
                      </div>

                      <span className="my-request-arrow">→</span>

                      <div>
                        <span>TO</span>
                        <h2>
                          {ride?.to || "Destination unavailable"}
                        </h2>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="my-request-meta">
                      <span>
                        Departure: {formatDate(ride?.departureTime)}
                      </span>

                      <span>
                        Requested: {formatDate(request.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Status and actions */}
                  <div className="my-request-footer">

                    <div className="my-request-status-wrapper">
                      {category === "completed" && (
                        <span
                          className="my-request-completed-icon"
                          title="Completed"
                        >
                          ✓
                        </span>
                      )}

                      <span
                        className={`my-request-status ${
                          category === "completed"
                            ? "completed"
                            : request.status
                        }`}
                      >
                        {getStatusLabel(request)}
                      </span>
                    </div>

                    <div className="my-request-actions">

                      {ride?._id && (
                        <Link
                          to={`/rides/${ride._id}`}
                          className="my-request-view-link"
                        >
                          View Ride
                        </Link>
                      )}

                      {canCancel && (
                        <button
                          className="my-request-cancel-button"
                          onClick={() =>
                            handleCancelRequest(request._id)
                          }
                          disabled={processingId === request._id}
                        >
                          {processingId === request._id
                            ? "Cancelling..."
                            : "Cancel Request"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Review owner */}
                  {canReview && (
                    <div className="my-request-review-section">

                      {request.reviewedByYou ? (
                        <p className="my-review-submitted">
                          {reviewSuccess ||
                            "✓ You have already submitted your review."}
                        </p>
                      ) : (
                        <>
                          {reviewSuccess &&
                            reviewingId !== request._id && (
                              <p className="my-review-success">
                                {reviewSuccess}
                              </p>
                            )}

                          {reviewingId !== request._id ? (
                            <button
                              type="button"
                              className="my-review-open-button"
                              onClick={() =>
                                openReviewForm(request._id)
                              }
                            >
                              ★ Review Owner
                            </button>
                          ) : (
                            <div className="my-review-form">

                              <div className="my-review-form-header">
                                <h3>Review Ride Owner</h3>

                                <button
                                  type="button"
                                  onClick={closeReviewForm}
                                  disabled={reviewProcessing}
                                >
                                  ×
                                </button>
                              </div>

                              <p>
                                How was your experience with this owner?
                              </p>

                              {/* Star rating */}
                              <div className="my-review-stars">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    className={
                                      star <= reviewRating
                                        ? "selected"
                                        : ""
                                    }
                                    onClick={() =>
                                      setReviewRating(star)
                                    }
                                    disabled={reviewProcessing}
                                    aria-label={`Rate ${star} out of 5`}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>

                              {/* Optional comment */}
                              <textarea
                                value={reviewComment}
                                onChange={(e) =>
                                  setReviewComment(e.target.value)
                                }
                                placeholder="Share your experience (optional)..."
                                maxLength={500}
                                rows={3}
                                disabled={reviewProcessing}
                              />

                              <div className="my-review-character-count">
                                {reviewComment.length}/500
                              </div>

                              {reviewError && (
                                <p className="my-review-error">
                                  {reviewError}
                                </p>
                              )}

                              <button
                                type="button"
                                className="my-review-submit-button"
                                onClick={() =>
                                  handleSubmitReview(request)
                                }
                                disabled={reviewProcessing}
                              >
                                {reviewProcessing
                                  ? "Submitting..."
                                  : "Submit Review"}
                              </button>
                            </div>
                          )}
                        </>
                      )}

                    </div>
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

export default MyRequests;
