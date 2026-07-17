"use client";

type PlanningMode =
  | "solo"
  | "group";

type PlanningModeIllustrationProps = {
  mode: PlanningMode;
  selected?: boolean;
};

export function PlanningModeIllustration({
  mode,
  selected = false
}: PlanningModeIllustrationProps) {
  return (
    <div
      className={`planning-mode-illustration ${
        selected
          ? "is-selected"
          : ""
      }`}
      aria-hidden="true"
    >
      {mode === "solo" ? (
        <svg
          className="planning-art-svg"
          viewBox="0 0 360 210"
          focusable="false"
        >
          <circle
            className="planning-art-sun"
            cx="297"
            cy="40"
            r="27"
          />

          <path
            className="planning-art-route"
            d="M24 168 C72 136 111 179 156 145 C207 106 247 149 328 91"
          />

          <g className="planning-art-pin planning-art-pin-one">
            <path d="M36 145 C36 130 47 120 62 120 C77 120 88 130 88 145 C88 163 62 185 62 185 C62 185 36 163 36 145Z" />

            <circle
              cx="62"
              cy="145"
              r="7"
            />
          </g>

          <g className="planning-art-pin planning-art-pin-two">
            <path d="M294 83 C294 70 304 61 317 61 C330 61 340 70 340 83 C340 99 317 118 317 118 C317 118 294 99 294 83Z" />

            <circle
              cx="317"
              cy="83"
              r="6"
            />
          </g>

          <ellipse
            className="planning-art-shadow"
            cx="184"
            cy="184"
            rx="63"
            ry="10"
          />

          <g className="planning-solo-character">
            <g className="planning-solo-legs">
              <path
                className="planning-solo-leg"
                d="M171 145 L159 182"
              />

              <path
                className="planning-solo-leg"
                d="M193 145 L210 181"
              />

              <path
                className="planning-solo-shoe"
                d="M153 182 L167 182"
              />

              <path
                className="planning-solo-shoe"
                d="M205 181 L220 181"
              />
            </g>

            <path
              className="planning-solo-skirt"
              d="M159 113 L201 113 L210 151 L149 151Z"
            />

            <path
              className="planning-solo-shirt"
              d="M158 82 C165 73 194 73 202 83 L200 121 L158 121Z"
            />

            <path
              className="planning-solo-arm"
              d="M161 89 L132 111"
            />

            <path
              className="planning-solo-arm"
              d="M198 90 L224 111"
            />

            <g className="planning-solo-map">
              <path d="M218 99 L252 91 L254 126 L222 133Z" />

              <path
                className="planning-solo-map-line"
                d="M225 123 C231 106 241 118 248 98"
              />

              <circle
                cx="248"
                cy="98"
                r="3"
              />
            </g>

            <circle
              className="planning-solo-head"
              cx="180"
              cy="54"
              r="27"
            />

            <path
              className="planning-solo-hair"
              d="M153 57 C151 23 207 18 208 58 L200 77 L193 52 C185 60 170 62 155 53 L157 78Z"
            />

            <circle
              className="planning-face-eye"
              cx="171"
              cy="55"
              r="2.5"
            />

            <circle
              className="planning-face-eye"
              cx="188"
              cy="55"
              r="2.5"
            />

            <path
              className="planning-face-smile"
              d="M171 65 C176 72 185 72 191 64"
            />

            <path
              className="planning-solo-bag-strap"
              d="M163 81 C193 94 202 111 202 137"
            />

            <circle
              className="planning-solo-bag"
              cx="201"
              cy="132"
              r="14"
            />
          </g>

          <g className="planning-art-sparkles">
            <path d="M108 44 L108 61 M99 52 L117 52" />
            <path d="M269 137 L269 153 M261 145 L277 145" />

            <circle
              cx="119"
              cy="78"
              r="4"
            />
          </g>

          <g className="planning-solo-coffee">
            <path d="M93 96 L119 96 L116 121 L97 121Z" />
            <path d="M118 101 C132 99 131 114 117 114" />
            <path d="M100 88 C95 80 106 78 101 69" />
            <path d="M110 88 C105 80 116 78 111 69" />
          </g>
        </svg>
      ) : (
        <svg
          className="planning-art-svg"
          viewBox="0 0 360 210"
          focusable="false"
        >
          <circle
            className="planning-art-sun"
            cx="52"
            cy="40"
            r="26"
          />

          <ellipse
            className="planning-art-shadow"
            cx="181"
            cy="184"
            rx="128"
            ry="11"
          />

          <g className="planning-group-confetti">
            <path d="M42 88 L57 73" />
            <path d="M298 77 L315 87" />
            <path d="M280 31 L281 52" />
            <path d="M95 36 L107 50" />

            <circle
              cx="70"
              cy="82"
              r="5"
            />

            <circle
              cx="308"
              cy="127"
              r="4"
            />
          </g>

          <g className="planning-group-person planning-group-person-one">
            <path
              className="planning-group-body planning-group-body-yellow"
              d="M48 115 C54 92 91 91 99 115 L104 170 L43 170Z"
            />

            <circle
              className="planning-group-head planning-skin-deep"
              cx="74"
              cy="78"
              r="25"
            />

            <path
              className="planning-group-hair"
              d="M49 78 C48 42 99 41 101 76 C88 68 64 68 50 81Z"
            />

            <circle
              className="planning-face-eye"
              cx="66"
              cy="78"
              r="2.4"
            />

            <circle
              className="planning-face-eye"
              cx="82"
              cy="78"
              r="2.4"
            />

            <path
              className="planning-face-smile"
              d="M65 88 C71 95 79 95 85 87"
            />

            <path
              className="planning-group-arm"
              d="M91 115 L130 137"
            />
          </g>

          <g className="planning-group-person planning-group-person-two">
            <path
              className="planning-group-body planning-group-body-red"
              d="M104 102 C111 79 150 78 158 103 L164 171 L100 171Z"
            />

            <circle
              className="planning-group-head planning-skin-light"
              cx="132"
              cy="65"
              r="26"
            />

            <path
              className="planning-group-hair planning-group-curls"
              d="M105 64 C102 37 112 29 127 30 C143 24 161 37 159 67 C150 52 118 51 105 64Z"
            />

            <circle
              className="planning-face-eye"
              cx="123"
              cy="65"
              r="2.4"
            />

            <circle
              className="planning-face-eye"
              cx="141"
              cy="65"
              r="2.4"
            />

            <path
              className="planning-face-smile"
              d="M122 75 C128 82 138 82 144 74"
            />

            <path
              className="planning-group-arm planning-group-wave"
              d="M112 105 L84 83"
            />
          </g>

          <g className="planning-group-person planning-group-person-three">
            <path
              className="planning-group-body planning-group-body-white"
              d="M166 103 C173 79 211 79 219 104 L224 171 L162 171Z"
            />

            <circle
              className="planning-group-head planning-skin-medium"
              cx="193"
              cy="65"
              r="26"
            />

            <path
              className="planning-group-hair"
              d="M167 66 C168 31 219 29 220 64 C208 55 183 54 168 69Z"
            />

            <circle
              className="planning-face-eye"
              cx="185"
              cy="65"
              r="2.4"
            />

            <circle
              className="planning-face-eye"
              cx="202"
              cy="65"
              r="2.4"
            />

            <path
              className="planning-face-smile"
              d="M184 75 C190 82 199 82 205 74"
            />

            <path
              className="planning-group-arm"
              d="M210 106 L239 132"
            />
          </g>

          <g className="planning-group-person planning-group-person-four">
            <path
              className="planning-group-body planning-group-body-teal"
              d="M227 116 C233 93 272 92 280 116 L286 170 L223 170Z"
            />

            <circle
              className="planning-group-head planning-skin-warm"
              cx="254"
              cy="79"
              r="25"
            />

            <path
              className="planning-group-hair planning-group-long-hair"
              d="M229 82 C226 45 279 41 280 80 L272 106 L268 73 C255 83 242 83 230 74 L233 108Z"
            />

            <circle
              className="planning-face-eye"
              cx="246"
              cy="79"
              r="2.4"
            />

            <circle
              className="planning-face-eye"
              cx="263"
              cy="79"
              r="2.4"
            />

            <path
              className="planning-face-smile"
              d="M245 89 C251 96 260 96 266 88"
            />

            <path
              className="planning-group-arm planning-group-wave-two"
              d="M270 116 L300 91"
            />
          </g>

          <g className="planning-group-hearts">
            <path d="M137 27 C129 17 111 25 137 44 C163 25 145 17 137 27Z" />
            <path d="M247 25 C241 17 227 23 247 39 C267 23 253 17 247 25Z" />
          </g>

          <g className="planning-group-ticket">
            <rect
              x="150"
              y="135"
              width="61"
              height="31"
              rx="8"
            />

            <path d="M181 137 L181 164" />

            <text
              x="162"
              y="155"
            >
              GO
            </text>
          </g>
        </svg>
      )}
    </div>
  );
}