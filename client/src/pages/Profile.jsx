
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import api from "../services/api";
import "./Profile.css";

function formatDate(value) {
  if (!value) return "Date unavailable";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Profile() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();

  const rideId = searchParams.get("rideId");

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // Profile picture state
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageError, setImageError] = useState("");
  const [imageSuccess, setImageSuccess] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch profile
  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/users/${userId}`, {
          params: rideId ? { rideId } : {}
        });

        if (isMounted) {
          setProfile(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
            "Unable to load this profile. Please try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [userId, rideId]);

  // Clean up temporary preview URL
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Edit profile handlers
  const handleEditClick = () => {
    setEditName(profile.user.name || "");
    setEditPhone(profile.user.phone || "");
    setEditError("");
    setEditSuccess("");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError("");
    setEditSuccess("");
  };

  const handleUpdateProfile = async (event) => {
    event.preventDefault();

    setEditError("");
    setEditSuccess("");

    const trimmedName = editName.trim();
    const trimmedPhone = editPhone.trim();

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setEditError("Name must be between 2 and 50 characters.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(trimmedPhone)) {
      setEditError("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setSaving(true);

      const response = await api.patch("/users/profile", {
        name: trimmedName,
        phone: trimmedPhone
      });

      setProfile((previousProfile) => ({
        ...previousProfile,
        user: {
          ...previousProfile.user,
          ...response.data.user
        }
      }));

      setEditSuccess("Profile updated successfully.");
      setIsEditing(false);
    } catch (err) {
      setEditError(
        err.response?.data?.message ||
        "Unable to update your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Profile picture handlers
  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setImageError("");
    setImageSuccess("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      setImageError("Only JPG, PNG and WEBP images are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image size must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleUploadProfilePicture = async () => {
    if (!selectedImage) return;

    setImageError("");
    setImageSuccess("");

    const formData = new FormData();
    formData.append("profileImage", selectedImage);

    try {
      setUploadingImage(true);

      const response = await api.patch(
        "/users/profile-picture",
        formData
      );

      setProfile((previousProfile) => ({
        ...previousProfile,
        user: {
          ...previousProfile.user,
          profileImage: response.data.profileImage,
          profileImagePublicId: response.data.profileImagePublicId
        }
      }));

      setSelectedImage(null);
      setImagePreview("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setImageSuccess("Profile picture updated successfully.");
    } catch (err) {
      setImageError(
        err.response?.data?.message ||
        "Unable to upload your profile picture. Please try again."
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCancelImageSelection = () => {
    setSelectedImage(null);
    setImagePreview("");
    setImageError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="profile-error-page">
        <div className="profile-error-card">
          <div className="profile-error-icon">!</div>
          <h2>Profile unavailable</h2>
          <p>{error || "We couldn't find this user."}</p>
          <Link to="/" className="profile-back-link">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const {
    user,
    isOwnProfile,
    contactNumberVisible,
    completedOwnerRides = 0,
    cancelledOwnerRides = 0,
    completedTravelerRides = 0,
    cancelledTravelerRequests = 0,
    totalCompletedRides = 0,
    totalCancellations = 0,
    oftenCancels = false,
    averageRating = 0,
    totalReviews = 0,
    reviews = []
  } = profile;

  return (
    <main className="profile-page">
      <div className="profile-container">

        <Link to="/" className="profile-back-home">
          <span>←</span> Back to home
        </Link>

        {/* Profile header */}
        <section className="profile-header-card">
          <div className="profile-header-content">
            <div className="profile-main-info">

              {/* Profile avatar and upload button */}
              <div className="profile-avatar-wrapper">
                <div className="profile-avatar">
                  {(imagePreview || user.profileImage) ? (
                    <img
                      src={imagePreview || user.profileImage}
                      alt={`${user.name}'s profile`}
                    />
                  ) : (
                    <span>{getInitials(user.name)}</span>
                  )}
                </div>

                {isOwnProfile && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageSelect}
                      hidden
                    />

                    <button
                      type="button"
                      className="profile-avatar-upload-button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      title="Change profile picture"
                    >
                      <span>＋</span>
                    </button>
                  </>
                )}
              </div>

              <div className="profile-name-section">
                <div className="profile-name-row">
                  <h1>{user.name}</h1>

                  {isOwnProfile && (
                    <span className="profile-self-badge">
                      Your profile
                    </span>
                  )}
                </div>

                <p className="profile-member-since">
                  Member since {formatDate(user.createdAt)}
                </p>

                <div className="profile-rating">
                  <span className="profile-star">★</span>
                  <strong>{Number(averageRating).toFixed(1)}</strong>
                  <span>
                    ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
                  </span>
                </div>
              </div>
            </div>

            {isOwnProfile && (
              <button
                type="button"
                className="profile-edit-button"
                onClick={handleEditClick}
              >
                <span>✎</span> Edit Profile
              </button>
            )}
          </div>

          {oftenCancels && (
            <div className="profile-warning">
              <span>!</span>
              <div>
                <strong>Frequently cancels rides</strong>
                <p>
                  This user has cancelled more rides than they have completed.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Profile picture upload messages and actions */}
        {isOwnProfile && (
          <>
            {imageError && (
              <p className="profile-form-message profile-form-error">
                {imageError}
              </p>
            )}

            {imageSuccess && (
              <p className="profile-form-message profile-form-success">
                ✓ {imageSuccess}
              </p>
            )}

            {selectedImage && (
              <div className="profile-image-actions">
                <p>
                  Preview your new profile picture before uploading.
                </p>

                <div>
                  <button
                    type="button"
                    className="profile-cancel-button"
                    onClick={handleCancelImageSelection}
                    disabled={uploadingImage}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="profile-save-button"
                    onClick={handleUploadProfilePicture}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? "Uploading..." : "Upload picture"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Edit profile form */}
        {isOwnProfile && isEditing && (
          <section className="profile-section-card profile-edit-card">
            <div className="profile-section-heading">
              <div>
                <h2>Edit your profile</h2>
                <p>Update the contact details shown on your account.</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile}>
              <div className="profile-edit-grid">
                <div className="profile-form-group">
                  <label htmlFor="profile-name">Full name</label>
                  <input
                    id="profile-name"
                    type="text"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    placeholder="Enter your name"
                    maxLength={50}
                    required
                  />
                </div>

                <div className="profile-form-group">
                  <label htmlFor="profile-phone">Phone number</label>
                  <input
                    id="profile-phone"
                    type="tel"
                    value={editPhone}
                    onChange={(event) =>
                      setEditPhone(
                        event.target.value.replace(/\D/g, "").slice(0, 10)
                      )
                    }
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                    maxLength={10}
                    required
                  />
                </div>

                <div className="profile-form-group profile-email-field">
                  <label htmlFor="profile-email">Email address</label>
                  <input
                    id="profile-email"
                    type="email"
                    value={user.email || ""}
                    disabled
                  />
                  <span>Email address cannot be changed here.</span>
                </div>
              </div>

              {editError && (
                <p className="profile-form-message profile-form-error">
                  {editError}
                </p>
              )}

              <div className="profile-edit-actions">
                <button
                  type="button"
                  className="profile-cancel-button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="profile-save-button"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        )}

        {isOwnProfile && editSuccess && (
          <p className="profile-form-message profile-form-success">
            ✓ {editSuccess}
          </p>
        )}

        {/* Contact details */}
        {(isOwnProfile || contactNumberVisible || user.email) && (
          <section className="profile-section-card">
            <div className="profile-section-heading">
              <div>
                <h2>Contact information</h2>
                <p>
                  {isOwnProfile
                    ? "Your account contact details"
                    : "Available contact information"}
                </p>
              </div>
            </div>

            <div className="profile-contact-grid">
              {isOwnProfile && user.email && (
                <div className="profile-contact-item">
                  <span className="profile-contact-icon">✉</span>
                  <div>
                    <span>Email address</span>
                    <strong>{user.email}</strong>
                  </div>
                </div>
              )}

              {contactNumberVisible && user.phone && (
                <div className="profile-contact-item">
                  <span className="profile-contact-icon">☎</span>
                  <div>
                    <span>Phone number</span>
                    <strong>{user.phone}</strong>
                  </div>
                </div>
              )}

              {!isOwnProfile && !contactNumberVisible && (
                <p className="profile-contact-private">
                  Contact number is available only to approved ride
                  participants before departure.
                </p>
              )}
            </div>
          </section>
        )}

        {/* Ride statistics */}
        <section className="profile-section-card">
          <div className="profile-section-heading">
            <div>
              <h2>Ride activity</h2>
              <p>Ride history and reliability</p>
            </div>
          </div>

          <div className="profile-stats-grid">
            <div className="profile-stat-box">
              <span className="profile-stat-icon">✓</span>
              <strong>{totalCompletedRides}</strong>
              <span>Completed rides</span>
            </div>

            <div className="profile-stat-box">
              <span className="profile-stat-icon">↗</span>
              <strong>{totalCancellations}</strong>
              <span>Cancelled rides</span>
            </div>

            <div className="profile-stat-box">
              <span className="profile-stat-icon">★</span>
              <strong>{Number(averageRating).toFixed(1)}</strong>
              <span>Average rating</span>
            </div>

            <div className="profile-stat-box">
              <span className="profile-stat-icon">☰</span>
              <strong>{totalReviews}</strong>
              <span>Reviews received</span>
            </div>
          </div>

          <div className="profile-activity-details">
            <div>
              <h3>As a ride owner</h3>
              <p>
                <span>{completedOwnerRides}</span> completed
                <span className="profile-activity-separator">·</span>
                <span>{cancelledOwnerRides}</span> cancelled
              </p>
            </div>

            <div>
              <h3>As a traveller</h3>
              <p>
                <span>{completedTravelerRides}</span> completed
                <span className="profile-activity-separator">·</span>
                <span>{cancelledTravelerRequests}</span> cancelled
              </p>
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section className="profile-section-card profile-reviews-section">
          <div className="profile-section-heading">
            <div>
              <h2>Reviews</h2>
              <p>What other RideMate members say</p>
            </div>

            <span className="profile-review-count">
              {totalReviews}
            </span>
          </div>

          {reviews.length === 0 ? (
            <div className="profile-empty-reviews">
              <div>☆</div>
              <h3>No reviews yet</h3>
              <p>
                Reviews from completed ride interactions will appear here.
              </p>
            </div>
          ) : (
            <div className="profile-review-list">
              {reviews.map((review) => (
                <article
                  className="profile-review-card"
                  key={review._id}
                >
                  <div className="profile-review-top">
                    <div className="profile-reviewer">
                      <div className="profile-reviewer-avatar">
                        {review.reviewer?.profileImage ? (
                          <img
                            src={review.reviewer.profileImage}
                            alt={review.reviewer.name}
                          />
                        ) : (
                          <span>
                            {getInitials(review.reviewer?.name || "User")}
                          </span>
                        )}
                      </div>

                      <div>
                        <strong>
                          {review.reviewer?.name || "RideMate member"}
                        </strong>
                        <span>{formatDate(review.createdAt)}</span>
                      </div>
                    </div>

                    <div className="profile-review-rating">
                      <span>★</span> {review.rating}/5
                    </div>
                  </div>

                  {review.comment && (
                    <p className="profile-review-comment">
                      {review.comment}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

export default Profile;
