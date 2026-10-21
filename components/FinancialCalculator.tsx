"use client";
import { useMemo, useState } from "react";
import { usd } from "@/lib/data";
import { RotateCcw } from "lucide-react";
import { money, calculateScenario } from "@/lib/finance";
export default function FinancialCalculator() {
  const [cost, setCost] = useState("440"),
    [sale, setSale] = useState("480"),
    [fee, setFee] = useState("13"),
    [shipping, setShipping] = useState("10");
  const [other, setOther] = useState("35"),
    [auto, setAuto] = useState("100"),
    [individualShipping, setIndividualShipping] = useState("10");
  const [mode, setMode] = useState<"custom" | "separated" | "scenario">(
    "custom",
  );
  const values = useMemo(
    () =>
      calculateScenario(
        cost,
        sale,
        fee,
        shipping,
        auto,
        other,
        individualShipping,
      ),
    [cost, sale, fee, shipping, other, auto, individualShipping],
  );
  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 17 }}>
        <div>
          <div className="eyebrow">Profitability laboratory</div>
          <h2>Rip vs. sell sealed</h2>
        </div>
        <button
          className="btn secondary"
          onClick={() => {
            setCost("440");
            setSale("480");
            setFee("13");
            setShipping("10");
            setAuto("100");
            setOther("35");
            setIndividualShipping("10");
            setMode("custom");
          }}
        >
          <RotateCcw size={15} /> Reset
        </button>
      </div>
      <div className="notice" style={{ marginBottom: 20 }}>
        Example inputs only. $480 is an editable scenario, not a verified
        current quote. Sale fees may depend on category, taxes and seller
        account.
      </div>
      <div className="grid" style={{ marginBottom: 20 }}>
        <div className="field">
          <label htmlFor="finance-1">Your box cost ($)</label>
          <input
            id="finance-1"
            type="number"
            min="0"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="finance-2">Sealed sale price ($)</label>
          <input
            id="finance-2"
            type="number"
            min="0"
            value={sale}
            onChange={(e) => setSale(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="finance-3">Marketplace fee (%)</label>
          <input
            id="finance-3"
            type="number"
            min="0"
            max="95"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
        </div>
      </div>
      <div className="field" style={{ maxWidth: 330 }}>
        <label htmlFor="finance-4">Sealed shipping & packaging ($)</label>
        <input
          id="finance-4"
          type="number"
          min="0"
          value={shipping}
          onChange={(e) => setShipping(e.target.value)}
        />
      </div>
      <div className="divider" />
      <div className="grid">
        <div className="card" style={{ background: "var(--surface2)" }}>
          <span className="muted small">Sealed net proceeds</span>
          <div className="stat">{usd(values.sealedNet)}</div>
          <span
            className={
              values.sealedNet - money(cost) >= 0 ? "positive" : "negative"
            }
          >
            {usd(values.sealedNet - money(cost))} profit/loss
          </span>
        </div>
        <div className="card" style={{ background: "var(--surface2)" }}>
          <span className="muted small">Sealed break-even listing</span>
          <div className="stat">{usd(values.breakEven)}</div>
          <span className="muted small">
            Before taxes and other incidentals
          </span>
        </div>
        <div className="card" style={{ background: "var(--surface2)" }}>
          <span className="muted small">Sell decision</span>
          <div
            className="stat"
            style={{ fontSize: 23, color: "var(--accent)" }}
          >
            {values.sealedNet >= money(cost) ? "Profitable" : "Below cost"}
          </div>
          <span className="muted small">Based on your inputs</span>
        </div>
      </div>
      <div className="divider" />
      <div className="row" style={{ marginBottom: 15 }}>
        <div>
          <h3>Experimental rip-value scenario</h3>
          <p className="small" style={{ margin: "3px 0" }}>
            Change your hypothetical pull values. This is not expected value or
            pull probability.
          </p>
        </div>
        <span className="tag amber">Experimental</span>
      </div>
      <div className="cols2">
        <div className="field">
          <label htmlFor="finance-5">Encased autograph resale value ($)</label>
          <input
            id="finance-5"
            type="number"
            min="0"
            value={auto}
            onChange={(e) => {
              setAuto(e.target.value);
              setMode("custom");
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="finance-6">Other 12 cards, combined resale ($)</label>
          <input
            id="finance-6"
            type="number"
            min="0"
            value={other}
            onChange={(e) => {
              setOther(e.target.value);
              setMode("custom");
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="finance-7">
            Combined singles shipping/packaging ($)
          </label>
          <input
            id="finance-7"
            type="number"
            min="0"
            value={individualShipping}
            onChange={(e) => setIndividualShipping(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="finance-8">Scenario preset</label>
          <select
            id="finance-8"
            value={mode}
            onChange={(e) => {
              const v = e.target.value as "custom" | "separated" | "scenario";
              setMode(v);
              if (v === "separated") {
                setAuto("25");
                setOther("20");
              } else if (v === "scenario") {
                setAuto("700");
                setOther("80");
              }
            }}
          >
            <option value="custom">Custom hypothetical values</option>
            <option value="separated">Weak pull (auto $25 / others $20)</option>
            <option value="scenario">
              Strong pull (auto $700 / others $80)
            </option>
          </select>
        </div>
      </div>
      <div
        className="card"
        style={{ background: "var(--surface2)", marginTop: 20 }}
      >
        <div className="row">
          <div>
            <span className="muted small">Illustrative opened-box net</span>
            <div className="stat">{usd(values.openedNet)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="muted small">Profit / loss vs. paid</span>
            <div
              className="stat"
              style={{
                fontSize: 24,
                color:
                  values.openedNet >= money(cost) ? "var(--accent)" : "#ff918e",
              }}
            >
              {usd(values.openedNet - money(cost))}
            </div>
          </div>
        </div>
        <div className="meter">
          <div
            className="meterFill"
            style={{
              width: `${Math.max(0, Math.min(100, (values.openedNet / Math.max(1, money(cost))) * 100))}%`,
            }}
          />
        </div>
      </div>
      <p className="small">
        The app deliberately does not compute a probability-weighted expected
        value yet. It needs representative sold-price data, accurate per-variant
        odds and a treatment for cards with no sales. Multiple singles shipments
        can make costs higher than this illustration.
      </p>
    </div>
  );
}
