
import { Link } from "react-router-dom";
import "./Home.css";
function Home() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="hero-content">
          <span className="hero-label">
            TRAVEL TOGETHER
          </span>

          <h1>
            Your journey is better
            <span> when shared.</span>
          </h1>

          <p>
            Find people heading in the same direction.
            Connect with fellow travellers and make
            your journey easier with RideMate.
          </p>

          <div className="hero-actions">
            <Link to="/rides" className="hero-primary-btn">
              Find a Ride <span>→</span>
            </Link>

            <Link
              to="/rides/create"
              className="hero-secondary-btn"
            >
              Offer a Ride
            </Link>
          </div>

          <div className="hero-note">
            <span className="note-dot"></span>
            Better journeys begin together.
          </div>
        </div>

        <div className="hero-image">
          <img
            src="/images/ridemate-road.png"
            alt="A scenic road representing shared journeys"
          />

          <div className="hero-image-caption">
            <span>THE JOURNEY MATTERS</span>
            <strong>Find your travel companions.</strong>
          </div>
        </div>
      </section>

      <section className="how-section">
        <div className="section-heading">
          <span>GET STARTED</span>
          <h2>How RideMate works</h2>
          <p>
            Three simple steps to make your next journey easier.
          </p>
        </div>

        <div className="how-grid">
          <div className="how-card">
            <div className="how-number">01</div>
            <h3>Discover a ride</h3>
            <p>
              Search for available rides heading towards
              your destination.
            </p>
          </div>

          <div className="how-card">
            <div className="how-number">02</div>
            <h3>Connect with travellers</h3>
            <p>
              Send a join request and wait for the ride
              owner to approve it.
            </p>
          </div>

          <div className="how-card">
            <div className="how-number">03</div>
            <h3>Travel together</h3>
            <p>
              Coordinate with your fellow travellers
              and enjoy the journey.
            </p>
          </div>
        </div>
      </section>

      <section className="home-bottom">
        <h2>Heading somewhere?</h2>
        <p>
          Find fellow travellers and make the journey together.
        </p>
        <Link to="/rides" className="hero-primary-btn">
          Explore Rides →
        </Link>
      </section>
    </main>
  );
}

export default Home;
