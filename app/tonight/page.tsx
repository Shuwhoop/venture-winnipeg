export default function TonightPage() {
  return (
    <>
      <div className="page-heading"><span>BUILT FOR YOU</span><h1>Tonight</h1></div>
      <div className="chips">
        {['Under $80', '2 people', 'Downtown', 'No alcohol'].map((chip, index) => (
          <button className={index === 0 ? "active" : ""} key={chip} type="button">{chip}</button>
        ))}
      </div>
      <article className="itinerary-card">
        <div className="itinerary-hero"><span>Your plan</span><h2>Downtown date night</h2></div>
        <div className="timeline-item"><time>6:00 PM</time><i /><div><h3>Deer + Almond</h3><p>Dinner · 7-minute walk</p></div></div>
        <div className="timeline-item"><time>8:15 PM</time><i /><div><h3>Live Comedy</h3><p>Rumor's Comedy Club · $20</p></div></div>
        <div className="itinerary-summary"><p><strong>$68 for two</strong><span>Estimated total</span></p><p><strong>Both verified</strong><span>Checked today</span></p></div>
        <div className="two-buttons"><button type="button">Swap one</button><button className="primary" type="button">Save plan</button></div>
      </article>
      <section className="reason-card"><h2>Why this works</h2><p>✓ Under budget</p><p>✓ Short travel time</p><p>✓ Matches date-night preferences</p><p>✓ Both listings recently verified</p></section>
    </>
  );
}
