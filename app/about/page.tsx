export default function About() {
  return (
    <>
      <section className="hero">
        <div className="eyebrow">Trust & methodology</div>
        <h1>Show the receipts.</h1>
        <p className="lead">
          Useful decisions require transparent inputs, not a proprietary
          confidence badge that hides missing data.
        </p>
      </section>
      <section className="section grid">
        {[
          {
            t: "What is verified",
            b: "Manufacturer specifications and the linked product checklist. A pulled card requires attributable photo, listing, or manufacturer/breaker evidence identifying the exact variant.",
          },
          {
            t: "What is unverified",
            b: "A card without a reviewed sighting. This does not establish that the card is unpulled, available, or distributed in hobby boxes.",
          },
          {
            t: "What the calculator does",
            b: "Applies user-entered prices, sales fees and shipping to sealed and opened scenarios. It is financial arithmetic, not an estimated average box value.",
          },
          {
            t: "What is coming next",
            b: "Source-linked sighting moderation, serial-by-serial copy tracking, authorized sales integrations, full checklist import and probability-weighted estimates after adequate coverage.",
          },
        ].map((i) => (
          <div key={i.t} className="card">
            <h3>{i.t}</h3>
            <p>{i.b}</p>
          </div>
        ))}
      </section>
      <div className="notice">
        Avoid mixing 2025–26 Topps Chrome Black Basketball with regular Topps
        Chrome Basketball or Chrome Updates. They have distinct checklists and
        chase pools.
      </div>
    </>
  );
}
