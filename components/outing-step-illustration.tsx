"use client";

type IllustrationKind =
  | "outing"
  | "when"
  | "interests"
  | "budget"
  | "area"
  | "travel"
  | "review";

type OutingStepIllustrationProps = {
  kind: IllustrationKind;
};

export function OutingStepIllustration({
  kind
}: OutingStepIllustrationProps) {
  return (
    <div
      className={`outing-step-art outing-step-art-${kind}`}
      aria-hidden="true"
    >
      {kind === "outing" ? (
        <>
          <span className="art-ticket art-ticket-left">
            V
          </span>

          <span className="art-ticket art-ticket-right">
            GO
          </span>

          <span className="art-floating-symbol">
            ✦
          </span>
        </>
      ) : null}

      {kind === "when" ? (
        <>
          <span className="art-clock-face">
            <i className="art-clock-hand art-clock-hour" />
            <i className="art-clock-hand art-clock-minute" />
          </span>

          <span className="art-calendar">
            <b>TONIGHT</b>
            <i>17</i>
          </span>
        </>
      ) : null}

      {kind === "interests" ? (
        <>
          <span className="art-interest-bubble art-interest-food">
            🍕
          </span>

          <span className="art-interest-bubble art-interest-music">
            ♪
          </span>

          <span className="art-interest-bubble art-interest-game">
            ★
          </span>

          <span className="art-interest-orbit" />
        </>
      ) : null}

      {kind === "budget" ? (
        <>
          <span className="art-coin art-coin-one">
            $
          </span>

          <span className="art-coin art-coin-two">
            $
          </span>

          <span className="art-coin art-coin-three">
            $
          </span>

          <span className="art-budget-smile">
            ◡
          </span>
        </>
      ) : null}

      {kind === "area" ? (
        <>
          <span className="art-map-route" />

          <span className="art-map-dot art-map-dot-one">
            1
          </span>

          <span className="art-map-dot art-map-dot-two">
            2
          </span>

          <span className="art-map-dot art-map-dot-three">
            3
          </span>
        </>
      ) : null}

      {kind === "travel" ? (
        <>
          <span className="art-travel-road" />

          <span className="art-travel-bus">
            BUS
          </span>

          <span className="art-travel-person">
            ●
          </span>

          <span className="art-travel-car">
            ▰
          </span>
        </>
      ) : null}

      {kind === "review" ? (
        <>
          <span className="art-review-card art-review-card-one">
            <i>1</i>
            <b>FOOD</b>
          </span>

          <span className="art-review-card art-review-card-two">
            <i>2</i>
            <b>EVENT</b>
          </span>

          <span className="art-review-check">
            ✓
          </span>
        </>
      ) : null}
    </div>
  );
}   