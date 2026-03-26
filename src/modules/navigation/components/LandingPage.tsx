interface LandingPageProps {
  onEnter: () => void;
}

export const LandingPage = ({ onEnter }: LandingPageProps) => {
  return (
    <section className="landing-screen" aria-label="MDC Landing Page">
      <div className="landing-bg-orb landing-bg-orb--one" />
      <div className="landing-bg-orb landing-bg-orb--two" />

      <div className="landing-content">
        <p className="landing-kicker">IT Assets Management Portal</p>

        <h1 className="landing-wordmark" aria-label="MDC">
          <span className="landing-letter landing-letter--m">M</span>
          <span className="landing-letter landing-letter--d">D</span>
          <span className="landing-letter landing-letter--c">C</span>
        </h1>

        <button type="button" className="landing-enter-btn" onClick={onEnter}>
          Get Started
        </button>
      </div>
    </section>
  );
};
