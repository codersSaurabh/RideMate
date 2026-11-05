
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import "./RideRequests.css";

function formatDate(value) {
  if (!value) return "Date unavailable";

  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

// Owner can review only an approved traveler after departure.
function canReviewTraveler(request, ride) {
  if (!ride || request.status !== "approved") {
    return false;
  }

  return (
    ride.status !== "cancelled" &&
    new Date(ride.departureTime).getTime() <= Date.now()
  );
}

function RideRequests() {
  const { rideId } = useParams();

  const [ride, setRide] = useState(null);
  const [requests, setRequests] = useState([]);

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

  const fetchRequests = async () => {
    try {
      setError("");

      const [rideResponse, requestsResponse] = await Promise.all([
        api.get(`/rides/${rideId}`),
        api.get(`/join-requests/ride/${rideId}`),
      ]);

      setRide(rideResponse.data.ride);
      setRequests(requestsResponse.data.requests || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load ride requests. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [rideId]);

  // Approve or reject a pending request.
  const handleRequestAction = async (requestId, action) => {
    try {
      setProcessingId(requestId);
      setActionError("");

      await api.patch(
        `/join-requests/${requestId}/${action}`
      );

      await fetchRequests();
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          `Unable to ${action} this request. Please try again.`
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

  // Submit review for traveler.
  const handleSubmitReview = async (request) => {
    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError("Please select a rating.");
      return;
    }

    if (!request.traveler?._id) {
      setReviewError("Traveler information is unavailable.");
      return;
    }

    try {
      setReviewProcessing(true);
      setReviewError("");

      const response = await api.post("/reviews", {
        rideId,
        revieweeId: request.traveler._id,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });

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
        setRequests((previous) =>
          previous.map((item) =>
            item._id === request._id
              ? { ...item, reviewedByYou: true }
              : item
          )
        );

        setReviewingId("");
        setReviewError("");
        setReviewSuccess("✓ You have already submitted your review.");
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

  const pendingCount = requests.filter(
    (request) => request.status === "pending"
  ).length;

  if (loading) {
    return (
      <main className="ride-requests-state">
        <div className="ride-requests-loader" />
        <p>Loading requests...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="ride-requests-state">
        <h2>Unable to load requests</h2>
        <p>{error}</p>

        <Link to="/rides/my" className="requests-back-link">
          Back to My Rides
        </Link>
      </main>
    );
  }

  return (
    <main className="ride-requests-page">
      <div className="ride-requests-container">
        <Link to="/rides/my" className="requests-back-link">
          ← Back to My Rides
        </Link>

        <header className="ride-requests-header">
          <div>
            <span className="requests-eyebrow">
              RIDEMATE • REQUEST MANAGEMENT
            </span>

            <h1>Ride Requests</h1>

            {ride && (
              <p>
                {ride.from} <span>→</span> {ride.to}
              </p>
            )}

            {ride && (
              <span className="requests-departure">
                Departure: {formatDate(ride.departureTime)}
              </span>
            )}
          </div>

          <div className="requests-summary">
            <strong>{requests.length}</strong>
            <span>Total requests</span>
            <small>{pendingCount} pending</small>
          </div>
        </header>

        {actionError && (
          <div className="requests-error-message">
            {actionError}
          </div>
        )}

        {requests.length === 0 ? (
          <section className="requests-empty">
            <h2>No requests yet</h2>
            <p>
              When someone requests to join this ride, their request
              will appear here.
            </p>
          </section>
        ) : (
          <section className="requests-list">
            {requests.map((request) => {
              const traveler = request.traveler;
              const isPending = request.status === "pending";
              const isProcessing = processingId === request._id;
              const canReview = canReviewTraveler(request, ride);

              // Only pending and approved requests have clickable profiles.
              const isProfileClickable =
                request.status === "pending" ||
                request.status === "approved";

              return (
                <article className="request-card" key={request._id}>
                  {/* Traveler profile section */}
                  {isProfileClickable ? (
                    <Link
                      to={`/users/${traveler?._id}?rideId=${rideId}`}
                      className="request-traveler traveler-profile-link"
                    >
                      <div className="request-avatar">
                        {traveler?.profileImage ? (
                          <img
                            src={traveler.profileImage}
                            alt={traveler.name || "Traveler"}
                          />
                        ) : (
                          <span>
                            {traveler?.name?.charAt(0)?.toUpperCase() || "U"}
                          </span>
                        )}
                      </div>

                      <div className="request-traveler-info">
                        <h3>
                          {traveler?.name || "Unknown traveler"}
                        </h3>

                        <p>
                          {traveler?.email || "Email unavailable"}
                        </p>

                        <span>
                          Requested on {formatDate(request.createdAt)}
                        </span>
                      </div>

                      <span className="traveler-profile-arrow">
                        →
                      </span>
                    </Link>
                  ) : (
                    <div className="request-traveler">
                      <div className="request-avatar">
                        {traveler?.profileImage ? (
                          <img
                            src={traveler.profileImage}
                            alt={traveler.name || "Traveler"}
                          />
                        ) : (
                          <span>
                            {traveler?.name?.charAt(0)?.toUpperCase() || "U"}
                          </span>
                        )}
                      </div>

                      <div className="request-traveler-info">
                        <h3>
                          {traveler?.name || "Unknown traveler"}
                        </h3>

                        <p>
                          {traveler?.email || "Email unavailable"}
                        </p>

                        <span>
                          Requested on {formatDate(request.createdAt)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="request-card-footer">
                    <span className={`request-status ${request.status}`}>
                      {request.status}
                    </span>

                    {isPending && (
                      <div className="request-actions">
                        <button
                          className="request-reject-button"
                          disabled={isProcessing}
                          onClick={() =>
                            handleRequestAction(request._id, "reject")
                          }
                        >
                          {isProcessing ? "Processing..." : "Reject"}
                        </button>

                        <button
                          className="request-approve-button"
                          disabled={isProcessing}
                          onClick={() =>
                            handleRequestAction(request._id, "approve")
                          }
                        >
                          {isProcessing ? "Processing..." : "Approve"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Owner review section */}
                  {canReview && (
                    <div className="owner-review-section">
                      {request.reviewedByYou ? (
                        <p className="owner-review-submitted">
                          {reviewSuccess ||
                            "✓ You have already submitted your review."}
                        </p>
                      ) : (
                        <>
                          {reviewSuccess &&
                            reviewingId !== request._id && (
                              <p className="owner-review-success">
                                {reviewSuccess}
                              </p>
                            )}

                          {reviewingId !== request._id ? (
                            <button
                              type="button"
                              className="owner-review-open-button"
                              onClick={() =>
                                openReviewForm(request._id)
                              }
                            >
                              ★ Review Traveler
                            </button>
                          ) : (
                            <div className="owner-review-form">
                              <div className="owner-review-form-header">
                                <h3>Review Traveler</h3>

                                <button
                                  type="button"
                                  onClick={closeReviewForm}
                                  disabled={reviewProcessing}
                                >
                                  ×
                                </button>
                              </div>

                              <p>
                                How was your experience with this traveler?
                              </p>

                              <div className="owner-review-stars">
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

                              <div className="owner-review-character-count">
                                {reviewComment.length}/500
                              </div>

                              {reviewError && (
                                <p className="owner-review-error">
                                  {reviewError}
                                </p>
                              )}

                              <button
                                type="button"
                                className="owner-review-submit-button"
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

export default RideRequests;
