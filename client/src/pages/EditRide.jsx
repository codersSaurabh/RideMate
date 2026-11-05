import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import "./EditRide.css";

function getLocalDateString(value) {
  const date = new Date(value);

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year").value;
  const month = parts.find((part) => part.type === "month").value;
  const day = parts.find((part) => part.type === "day").value;

  return `${year}-${month}-${day}`;
}

function getLocalTimeString(value) {
  return new Date(value).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  });
}

function EditRide() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    from: "",
    to: "",
    date: "",
    time: "",
    maxSeats: "1"
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRide = async () => {
      try {
        const response = await api.get(`/rides/${id}`);
        const ride = response.data.ride;

        setFormData({
          from: ride.from,
          to: ride.to,
          date: getLocalDateString(ride.departureTime),
          time: getLocalTimeString(ride.departureTime),
          maxSeats: String(ride.maxSeats)
        });
      } catch (err) {
        setError(
          err.response?.data?.message ||
          "Unable to load ride details. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRide();
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (
      formData.from.trim().toLowerCase() ===
      formData.to.trim().toLowerCase()
    ) {
      setError(
        "Starting point and destination must be different."
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to update this ride? Any pending join requests will be rejected and the travelers will be notified."
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      await api.patch(`/rides/${id}`, {
        from: formData.from.trim(),
        to: formData.to.trim(),
        date: formData.date,
        time: formData.time,
        maxSeats: Number(formData.maxSeats)
      });

      navigate("/rides/my");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to update your ride. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="edit-ride-state">
        <div className="edit-ride-loader" />
        <p>Loading ride details...</p>
      </main>
    );
  }

  if (error && !formData.from) {
    return (
      <main className="edit-ride-state">
        <h2>Unable to open this ride</h2>
        <p>{error}</p>

        <button
          type="button"
          className="edit-ride-back"
          onClick={() => navigate("/rides/my")}
        >
          Back to My Rides
        </button>
      </main>
    );
  }

  return (
    <main className="edit-ride-page">
      <div className="edit-ride-container">
        <div className="edit-ride-heading">
          <span className="edit-ride-eyebrow">
            MANAGE YOUR RIDE
          </span>

          <h1>Update your journey.</h1>

          <p>
            Make changes to your route or departure details.
          </p>
        </div>

        <form
          className="edit-ride-form"
          onSubmit={handleSubmit}
        >
          <div className="edit-ride-field">
            <label htmlFor="from">Starting point</label>

            <input
              id="from"
              name="from"
              value={formData.from}
              onChange={handleChange}
              placeholder="e.g. Agartala Railway Station"
              maxLength={100}
              required
            />
          </div>

          <div className="edit-ride-field">
            <label htmlFor="to">Destination</label>

            <input
              id="to"
              name="to"
              value={formData.to}
              onChange={handleChange}
              placeholder="e.g. NIT Agartala"
              maxLength={100}
              required
            />
          </div>

          <div className="edit-ride-form-row">
            <div className="edit-ride-field">
              <label htmlFor="date">Departure date</label>

              <input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="edit-ride-field">
              <label htmlFor="time">Departure time</label>

              <input
                id="time"
                name="time"
                type="time"
                value={formData.time}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="edit-ride-field">
            <label htmlFor="maxSeats">
              Additional people you can take
            </label>

            <select
              id="maxSeats"
              name="maxSeats"
              value={formData.maxSeats}
              onChange={handleChange}
              required
            >
              {[1, 2, 3, 4, 5, 6].map((seats) => (
                <option key={seats} value={seats}>
                  {seats} {seats === 1 ? "person" : "people"}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="edit-ride-error">{error}</p>
          )}

          <button
            className="edit-ride-submit"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving changes..." : "Save Changes"}
          </button>

          <button
            type="button"
            className="edit-ride-cancel"
            onClick={() => navigate("/rides/my")}
            disabled={saving}
          >
            Go Back
          </button>

          <p className="edit-ride-note">
            You can edit a ride only while it is open and no
            traveler has been approved. Updating a ride rejects
            its pending requests.
          </p>
        </form>
      </div>
    </main>
  );
}

export default EditRide;
