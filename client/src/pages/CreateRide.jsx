import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./CreateRide.css";

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function CreateRide() {
  const navigate = useNavigate();

  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 3);

  const [formData, setFormData] = useState({
    from: "",
    to: "",
    date: "",
    time: "",
    maxSeats: "1"
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    if (formData.from.trim().toLowerCase() === formData.to.trim().toLowerCase()) {
      setError("Starting point and destination must be different.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/rides", {
        ...formData,
        from: formData.from.trim(),
        to: formData.to.trim(),
        maxSeats: Number(formData.maxSeats)
      });

      navigate(`/rides/${response.data.ride._id}`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to create your ride. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="create-ride-page">
      <div className="create-ride-container">
        <div className="create-ride-heading">
          <span className="create-ride-eyebrow">OFFER A RIDE</span>
          <h1>Make room for a fellow traveler.</h1>
          <p>Share your route and help someone get where they’re going.</p>
        </div>

        <form className="create-ride-form" onSubmit={handleSubmit}>
          <div className="create-ride-field">
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

          <div className="create-ride-field">
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

          <div className="create-ride-form-row">
            <div className="create-ride-field">
              <label htmlFor="date">Departure date</label>
              <input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                min={getLocalDateString(today)}
                max={getLocalDateString(maxDate)}
                required
              />
            </div>

            <div className="create-ride-field">
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

          <div className="create-ride-field">
            <label htmlFor="maxSeats">Additional people you can take</label>
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

          {error && <p className="create-ride-error">{error}</p>}

          <button
            className="create-ride-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating ride..." : "Create Ride"}
          </button>

          <p className="create-ride-note">
            Rides must be created at least one hour before departure.
          </p>
        </form>
      </div>
    </main>
  );
}

export default CreateRide;