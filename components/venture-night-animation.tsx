"use client";

export function VentureNightAnimation() {
  return (
    <div
      className="vna-root"
      role="img"
      aria-label="An animated Venture evening featuring friends watching football, a restaurant date, bowling, and a zoo visit"
    >
      <div className="vna-stage">
        {/* Scene 1: football at a bar */}

        <div className="vna-scene vna-scene-one">
          <svg
            viewBox="0 0 480 270"
            aria-hidden="true"
          >
            <rect
              width="480"
              height="270"
              rx="22"
              fill="#fff8ef"
            />

            <rect
              x="106"
              y="17"
              width="268"
              height="112"
              rx="15"
              fill="#0b2b50"
            />

            <rect
              x="119"
              y="30"
              width="242"
              height="86"
              rx="8"
              fill="#56a75c"
            />

            <path
              d="M240 31V115"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
            />

            <circle
              cx="240"
              cy="73"
              r="25"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
            />

            <path
              d="M121 50H152V96H121M359 50H328V96H359"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
            />

            <circle
              className="vna-tv-ball"
              cx="220"
              cy="75"
              r="7"
              fill="#ffffff"
              stroke="#0b2b50"
              strokeWidth="2"
            />

            <rect
              x="15"
              y="202"
              width="450"
              height="49"
              rx="15"
              fill="#dc2f3b"
              stroke="#0b2b50"
              strokeWidth="4"
            />

            <g
              fill="#ffffff"
              stroke="#0b2b50"
              strokeWidth="3"
              strokeLinejoin="round"
            >
              <path d="M55 182H78L74 207H59Z" />
              <path d="M165 181H188L184 207H169Z" />
              <path d="M282 181H305L301 207H286Z" />
              <path d="M397 182H420L416 207H401Z" />
            </g>

            <g className="vna-fan vna-fan-one">
              <circle
                cx="75"
                cy="154"
                r="23"
                fill="#74462f"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M53 154C53 123 98 122 99 154C87 145 65 145 53 158Z"
                fill="#0b2b50"
              />

              <path
                d="M43 183C50 164 96 164 107 184L111 224H38Z"
                fill="#ffd6b3"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M65 160C71 169 82 169 89 159"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="3"
                strokeLinecap="round"
              />

              <path
                className="vna-wave-left"
                d="M54 188L26 151"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="8"
                strokeLinecap="round"
              />
            </g>

            <g className="vna-fan vna-main-fan">
              <circle
                cx="183"
                cy="147"
                r="25"
                fill="#bd7956"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M159 147C160 115 207 114 209 147C196 138 174 137 160 151Z"
                fill="#0b2b50"
              />

              <path
                d="M151 178C158 158 204 158 215 179L220 226H145Z"
                fill="#dc2f3b"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M172 154C179 163 190 163 197 153"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="3"
                strokeLinecap="round"
              />

              <path
                className="vna-main-arm-left"
                d="M160 184L132 132"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="8"
                strokeLinecap="round"
              />

              <path
                className="vna-main-arm-right"
                d="M207 184L237 132"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="8"
                strokeLinecap="round"
              />
            </g>

            <g className="vna-fan vna-fan-three">
              <circle
                cx="300"
                cy="153"
                r="24"
                fill="#efc19d"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M277 153C277 122 323 122 324 153C312 144 290 144 277 157Z"
                fill="#68412d"
              />

              <path
                d="M270 183C276 164 319 164 330 184L334 225H264Z"
                fill="#ffffff"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M289 160C295 168 305 168 312 159"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="3"
                strokeLinecap="round"
              />

              <path
                className="vna-wave-right"
                d="M322 189L354 148"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="8"
                strokeLinecap="round"
              />
            </g>

            <g className="vna-fan vna-fan-four">
              <circle
                cx="408"
                cy="159"
                r="22"
                fill="#d99570"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M386 162C381 128 431 124 432 158L425 193L418 151C407 162 396 163 386 154Z"
                fill="#0b2b50"
              />

              <path
                d="M380 187C386 170 426 170 435 188L439 225H375Z"
                fill="#dc2f3b"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M398 166C404 174 413 174 419 165"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>

            <g
              className="vna-confetti"
              fill="#ffd6b3"
              stroke="#dc2f3b"
              strokeWidth="4"
              strokeLinecap="round"
            >
              <circle cx="44" cy="69" r="5" />
              <circle cx="426" cy="69" r="5" />
              <path d="M73 36L91 52" />
              <path d="M404 36L386 54" />
              <path d="M83 104L101 91" />
              <path d="M400 104L382 91" />
            </g>
          </svg>
        </div>

        {/* Scene 2: restaurant date */}

        <div className="vna-scene vna-scene-two">
          <svg
            viewBox="0 0 480 270"
            aria-hidden="true"
          >
            <rect
              width="480"
              height="270"
              rx="22"
              fill="#fff1df"
            />

            <g
              stroke="#0b2b50"
              strokeWidth="4"
            >
              <path d="M72 0V34" />
              <path d="M240 0V30" />
              <path d="M408 0V34" />

              <circle
                className="vna-date-light"
                cx="72"
                cy="48"
                r="18"
                fill="#ffd6b3"
              />

              <circle
                className="vna-date-light"
                cx="240"
                cy="44"
                r="18"
                fill="#ffd6b3"
              />

              <circle
                className="vna-date-light"
                cx="408"
                cy="48"
                r="18"
                fill="#ffd6b3"
              />
            </g>

            <g opacity="0.78">
              <ellipse
                cx="72"
                cy="178"
                rx="59"
                ry="21"
                fill="#ffffff"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <circle
                cx="48"
                cy="135"
                r="16"
                fill="#efc19d"
                stroke="#0b2b50"
                strokeWidth="3"
              />

              <circle
                cx="99"
                cy="135"
                r="16"
                fill="#74462f"
                stroke="#0b2b50"
                strokeWidth="3"
              />

              <path
                d="M27 162Q48 141 69 162"
                fill="#dc2f3b"
              />

              <path
                d="M78 162Q99 141 120 162"
                fill="#ffd6b3"
              />

              <ellipse
                cx="408"
                cy="178"
                rx="59"
                ry="21"
                fill="#ffffff"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <circle
                cx="383"
                cy="135"
                r="16"
                fill="#bd7956"
                stroke="#0b2b50"
                strokeWidth="3"
              />

              <circle
                cx="433"
                cy="135"
                r="16"
                fill="#efc19d"
                stroke="#0b2b50"
                strokeWidth="3"
              />

              <path
                d="M362 162Q383 141 404 162"
                fill="#ffffff"
                stroke="#0b2b50"
                strokeWidth="2"
              />

              <path
                d="M412 162Q433 141 454 162"
                fill="#dc2f3b"
              />
            </g>

            <g className="vna-server">
              <circle
                cx="385"
                cy="84"
                r="17"
                fill="#d99570"
                stroke="#0b2b50"
                strokeWidth="3"
              />

              <path
                d="M369 84C369 62 402 62 403 84C393 77 379 77 369 87Z"
                fill="#0b2b50"
              />

              <path
                d="M363 106Q385 93 407 107L410 150H360Z"
                fill="#0b2b50"
              />

              <path
                d="M364 115L335 128"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="7"
                strokeLinecap="round"
              />

              <ellipse
                cx="318"
                cy="130"
                rx="25"
                ry="6"
                fill="#dc2f3b"
                stroke="#0b2b50"
                strokeWidth="3"
              />
            </g>

            <ellipse
              cx="240"
              cy="189"
              rx="89"
              ry="30"
              fill="#ffffff"
              stroke="#0b2b50"
              strokeWidth="4"
            />

            <rect
              x="232"
              y="189"
              width="16"
              height="55"
              rx="8"
              fill="#0b2b50"
            />

            <g className="vna-date-person">
              <circle
                cx="172"
                cy="124"
                r="25"
                fill="#bd7956"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M148 124C149 92 197 92 198 124C185 115 163 114 149 128Z"
                fill="#0b2b50"
              />

              <path
                d="M141 156C148 137 193 137 204 157L208 220H136Z"
                fill="#dc2f3b"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <circle cx="164" cy="125" r="2.5" fill="#0b2b50" />
              <circle cx="181" cy="125" r="2.5" fill="#0b2b50" />

              <path
                d="M162 137C169 133 177 133 184 137"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="3"
                strokeLinecap="round"
              />

              <path
                d="M195 164L223 183"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="8"
                strokeLinecap="round"
              />

              <g
                className="vna-sweat"
                fill="#dc2f3b"
              >
                <path d="M199 103C209 114 203 124 196 118C191 114 194 108 199 103Z" />
                <path d="M211 117C219 126 214 134 208 129C204 126 207 121 211 117Z" />
              </g>
            </g>

            <g className="vna-date-person vna-date-girl">
              <circle
                cx="307"
                cy="122"
                r="25"
                fill="#74462f"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M283 126C277 89 332 83 334 121L326 161L319 113C308 125 295 126 283 117Z"
                fill="#0b2b50"
              />

              <path
                d="M277 155C284 137 326 137 337 157L341 220H271Z"
                fill="#ffd6b3"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <circle cx="299" cy="123" r="2.5" fill="#0b2b50" />
              <circle cx="316" cy="123" r="2.5" fill="#0b2b50" />

              <path
                d="M297 134C304 143 314 143 321 133"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="3"
                strokeLinecap="round"
              />

              <path
                d="M285 163L253 182"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="8"
                strokeLinecap="round"
              />
            </g>

            <g
              fill="#ffffff"
              stroke="#0b2b50"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M216 153H235L232 182H220Z" />
              <path d="M252 153H271L268 182H256Z" />
              <path d="M225 145C220 137 231 134 226 126" />
              <path d="M261 145C256 137 267 134 262 126" />
            </g>

            <g
              className="vna-hearts"
              fill="#dc2f3b"
            >
              <path d="M231 87C223 76 205 85 231 104C257 85 239 76 231 87Z" />
              <path d="M267 101C261 93 247 100 267 115C287 100 273 93 267 101Z" />
            </g>
          </svg>
        </div>

        {/* Scene 3: bowling */}

        <div className="vna-scene vna-scene-three">
          <svg
            viewBox="0 0 480 270"
            aria-hidden="true"
          >
            <rect
              width="480"
              height="270"
              rx="22"
              fill="#fff3d3"
            />

            <rect
              x="138"
              y="18"
              width="204"
              height="49"
              rx="12"
              fill="#0b2b50"
            />

            <g fill="#ffd6b3">
              <circle cx="177" cy="43" r="8" />
              <circle cx="210" cy="43" r="8" />
              <circle cx="243" cy="43" r="8" />
              <circle cx="276" cy="43" r="8" />
              <circle cx="309" cy="43" r="8" />
            </g>

            <path
              d="M187 72H352L430 250H110Z"
              fill="#f5c56d"
              stroke="#0b2b50"
              strokeWidth="4"
            />

            <path
              d="M270 76V246"
              fill="none"
              stroke="#dc2f3b"
              strokeWidth="4"
              strokeDasharray="11 9"
            />

            <g
              className="vna-pins"
              fill="#ffffff"
              stroke="#0b2b50"
              strokeWidth="4"
              strokeLinejoin="round"
            >
              <path d="M248 88C242 73 244 56 255 52C266 56 268 73 262 88L270 112H240Z" />
              <path d="M279 84C273 69 275 52 286 48C297 52 299 69 293 84L301 108H271Z" />
              <path d="M310 88C304 73 306 56 317 52C328 56 330 73 324 88L332 112H302Z" />
            </g>

            <g className="vna-bowler">
              <circle
                cx="139"
                cy="137"
                r="25"
                fill="#74462f"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M115 142C109 103 165 98 167 136L159 176L152 128C141 140 128 141 115 132Z"
                fill="#0b2b50"
              />

              <path
                d="M108 169C115 150 157 150 168 170L174 229H102Z"
                fill="#ffd6b3"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M157 176L207 199"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="8"
                strokeLinecap="round"
              />

              <path
                d="M116 174L87 143"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="8"
                strokeLinecap="round"
              />

              <path
                d="M140 220L168 247"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="8"
                strokeLinecap="round"
              />

              <path
                d="M129 146C136 154 146 154 153 145"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>

            <g className="vna-ball">
              <circle
                cx="222"
                cy="211"
                r="19"
                fill="#dc2f3b"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <circle cx="215" cy="203" r="2.8" fill="#0b2b50" />
              <circle cx="225" cy="201" r="2.8" fill="#0b2b50" />
              <circle cx="232" cy="209" r="2.8" fill="#0b2b50" />
            </g>

            <g className="vna-bowling-guy">
              <circle
                cx="409"
                cy="145"
                r="24"
                fill="#bd7956"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M386 145C387 114 433 114 434 145C421 136 400 136 387 149Z"
                fill="#0b2b50"
              />

              <path
                d="M379 175C386 157 429 157 439 176L444 231H374Z"
                fill="#dc2f3b"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M399 152C406 160 416 160 423 151"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="3"
                strokeLinecap="round"
              />

              <path
                className="vna-clap-left"
                d="M390 184L363 165"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="8"
                strokeLinecap="round"
              />

              <path
                className="vna-clap-right"
                d="M428 183L363 165"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="8"
                strokeLinecap="round"
              />
            </g>

            <g
              className="vna-stars"
              fill="#ffd6b3"
              stroke="#0b2b50"
              strokeWidth="3"
            >
              <path d="M61 50L67 67L85 72L68 78L62 96L56 79L38 73L55 67Z" />
              <path d="M407 47L412 61L427 66L413 71L408 87L403 72L388 67L402 61Z" />
            </g>
          </svg>
        </div>

        {/* Scene 4: zoo */}

        <div className="vna-scene vna-scene-four">
          <svg
            viewBox="0 0 480 270"
            aria-hidden="true"
          >
            <rect
              width="480"
              height="270"
              rx="22"
              fill="#dff5ef"
            />

            <circle
              cx="414"
              cy="46"
              r="28"
              fill="#ffd6b3"
              stroke="#0b2b50"
              strokeWidth="4"
            />

            <path
              d="M0 157C76 117 154 155 232 123C314 90 399 118 480 88V270H0Z"
              fill="#7abd65"
            />

            <g>
              <rect x="38" y="114" width="12" height="88" rx="6" fill="#765033" />
              <circle cx="44" cy="99" r="36" fill="#4e9d53" stroke="#0b2b50" strokeWidth="3" />

              <rect x="409" y="111" width="12" height="91" rx="6" fill="#765033" />
              <circle cx="415" cy="95" r="39" fill="#4e9d53" stroke="#0b2b50" strokeWidth="3" />

              <rect x="331" y="136" width="10" height="66" rx="5" fill="#765033" />
              <circle cx="336" cy="125" r="28" fill="#4e9d53" stroke="#0b2b50" strokeWidth="3" />
            </g>

            <g className="vna-giraffe">
              <path
                d="M54 136Q94 115 128 138L129 202H63Z"
                fill="#ffd6b3"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M105 139L116 48H145L133 145Z"
                fill="#ffd6b3"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <circle
                cx="132"
                cy="44"
                r="19"
                fill="#ffd6b3"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M116 35L101 25L105 45Z"
                fill="#ffd6b3"
                stroke="#0b2b50"
                strokeWidth="3"
              />

              <path
                d="M146 34L160 23L158 44Z"
                fill="#ffd6b3"
                stroke="#0b2b50"
                strokeWidth="3"
              />

              <circle cx="126" cy="42" r="2.5" fill="#0b2b50" />
              <circle cx="140" cy="42" r="2.5" fill="#0b2b50" />

              <g fill="#9a5e27">
                <circle cx="84" cy="149" r="8" />
                <circle cx="111" cy="166" r="7" />
                <circle cx="86" cy="185" r="6" />
                <circle cx="123" cy="95" r="6" />
                <circle cx="128" cy="71" r="5" />
              </g>
            </g>

            <g className="vna-elephant">
              <ellipse
                cx="371"
                cy="168"
                rx="54"
                ry="41"
                fill="#9da1a6"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <circle
                cx="334"
                cy="158"
                r="33"
                fill="#9da1a6"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <circle
                cx="355"
                cy="156"
                r="24"
                fill="#aeb2b6"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M307 165C286 178 290 202 308 205"
                fill="none"
                stroke="#9da1a6"
                strokeWidth="18"
                strokeLinecap="round"
              />

              <circle cx="326" cy="151" r="3" fill="#0b2b50" />
            </g>

            <path
              d="M0 211H480"
              fill="none"
              stroke="#0b2b50"
              strokeWidth="5"
              strokeDasharray="17 8"
            />

            <g className="vna-zoo-girl">
              <circle
                cx="216"
                cy="158"
                r="23"
                fill="#74462f"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M194 161C189 127 239 122 240 157L233 190L227 150C217 160 205 161 194 153Z"
                fill="#0b2b50"
              />

              <path
                d="M188 187C194 171 232 171 242 188L247 245H183Z"
                fill="#ffd6b3"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M196 192L220 175M235 193L220 175"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="8"
                strokeLinecap="round"
              />

              <rect
                x="209"
                y="165"
                width="30"
                height="22"
                rx="5"
                fill="#dc2f3b"
                stroke="#0b2b50"
                strokeWidth="3"
              />

              <circle
                cx="224"
                cy="176"
                r="7"
                fill="#ffd6b3"
                stroke="#0b2b50"
                strokeWidth="3"
              />
            </g>

            <g className="vna-zoo-guy">
              <circle
                cx="285"
                cy="161"
                r="23"
                fill="#bd7956"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                d="M263 161C264 132 307 132 308 161C296 153 276 152 264 165Z"
                fill="#0b2b50"
              />

              <path
                d="M256 190C263 173 303 173 313 191L318 245H251Z"
                fill="#dc2f3b"
                stroke="#0b2b50"
                strokeWidth="4"
              />

              <path
                className="vna-point"
                d="M302 195L347 151"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="8"
                strokeLinecap="round"
              />

              <path
                d="M275 168C282 176 292 176 299 167"
                fill="none"
                stroke="#0b2b50"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>

            <path
              className="vna-camera-flash"
              d="M181 133L187 148L203 153L188 159L182 175L176 160L160 154L175 148Z"
              fill="#ffd6b3"
              stroke="#0b2b50"
              strokeWidth="3"
            />
          </svg>
        </div>
      </div>

      <style jsx global>{`
        .vna-root {
          width: 100%;
          overflow: hidden;
          border: 3px solid #0b2b50;
          border-radius: 22px;
          background:
            linear-gradient(
              145deg,
              #dc2f3b,
              #ffd6b3
            );
          box-shadow:
            7px 8px 0
            rgba(36, 31, 32, 0.16);
        }

        .vna-stage {
          position: relative;
          height: 300px;
          overflow: hidden;
        }

        .vna-scene {
          position: absolute;
          inset: 12px;
          overflow: hidden;
          border: 3px solid #0b2b50;
          border-radius: 18px;
          background: #fff8ef;
          opacity: 0;
          transform:
            translateX(20px)
            scale(0.98);
          animation:
            vna-scene-cycle
            16s infinite both;
        }

        .vna-scene-one {
          animation-delay: 0s;
        }

        .vna-scene-two {
          animation-delay: -12s;
        }

        .vna-scene-three {
          animation-delay: -8s;
        }

        .vna-scene-four {
          animation-delay: -4s;
        }

        .vna-scene svg {
          display: block;
          width: 100%;
          height: 100%;
        }

        @keyframes vna-scene-cycle {
          0%,
          21% {
            opacity: 1;
            transform:
              translateX(0)
              scale(1);
          }

          24.5% {
            opacity: 0;
            transform:
              translateX(-20px)
              scale(0.98);
          }

          25%,
          100% {
            opacity: 0;
            transform:
              translateX(20px)
              scale(0.98);
          }
        }

        .vna-tv-ball {
          animation:
            vna-tv-ball
            1.8s ease-in-out infinite;
        }

        @keyframes vna-tv-ball {
          50% {
            transform:
              translateX(40px)
              translateY(-8px);
          }
        }

        .vna-fan {
          transform-origin:
            center bottom;
          animation:
            vna-fan-bounce
            1.25s ease-in-out infinite;
        }

        .vna-fan-one {
          animation-delay: 100ms;
        }

        .vna-main-fan {
          animation-delay: 240ms;
        }

        .vna-fan-three {
          animation-delay: 380ms;
        }

        .vna-fan-four {
          animation-delay: 520ms;
        }

        @keyframes vna-fan-bounce {
          50% {
            transform:
              translateY(-8px)
              rotate(1deg);
          }
        }

        .vna-wave-left,
        .vna-main-arm-left {
          transform-origin:
            center bottom;
          animation:
            vna-arm-left
            850ms ease-in-out infinite;
        }

        .vna-wave-right,
        .vna-main-arm-right {
          transform-origin:
            center bottom;
          animation:
            vna-arm-right
            900ms ease-in-out infinite;
        }

        @keyframes vna-arm-left {
          50% {
            transform: rotate(-13deg);
          }
        }

        @keyframes vna-arm-right {
          50% {
            transform: rotate(13deg);
          }
        }

        .vna-confetti {
          animation:
            vna-confetti
            1.4s ease-in-out infinite;
        }

        @keyframes vna-confetti {
          50% {
            transform:
              translateY(8px)
              rotate(5deg);
          }
        }

        .vna-date-light {
          animation:
            vna-light
            1.8s ease-in-out infinite;
        }

        @keyframes vna-light {
          50% {
            fill: #dc2f3b;
            transform:
              translateY(3px);
          }
        }

        .vna-server {
          animation:
            vna-server
            3.2s ease-in-out infinite;
        }

        @keyframes vna-server {
          50% {
            transform:
              translateX(-19px);
          }
        }

        .vna-date-person {
          transform-origin:
            center bottom;
          animation:
            vna-date-bob
            1.8s ease-in-out infinite;
        }

        .vna-date-girl {
          animation-delay: 220ms;
        }

        @keyframes vna-date-bob {
          50% {
            transform:
              translateY(-5px);
          }
        }

        .vna-sweat {
          animation:
            vna-sweat
            1s ease-in-out infinite;
        }

        @keyframes vna-sweat {
          50% {
            opacity: 0.25;
            transform:
              translateY(7px);
          }
        }

        .vna-hearts {
          animation:
            vna-hearts
            1.5s ease-in-out infinite;
        }

        @keyframes vna-hearts {
          50% {
            transform:
              translateY(-8px)
              scale(1.06);
          }
        }

        .vna-pins {
          transform-origin:
            center bottom;
          animation:
            vna-pins
            1.4s ease-in-out infinite;
        }

        @keyframes vna-pins {
          50% {
            transform:
              rotate(3deg)
              translateX(3px);
          }
        }

        .vna-bowler {
          transform-origin:
            center bottom;
          animation:
            vna-bowler
            1.7s ease-in-out infinite;
        }

        @keyframes vna-bowler {
          50% {
            transform:
              translateX(5px)
              rotate(2deg);
          }
        }

        .vna-ball {
          transform-origin:
            center;
          animation:
            vna-ball
            2.1s ease-in-out infinite;
        }

        @keyframes vna-ball {
          50% {
            transform:
              translateX(70px)
              translateY(-91px)
              rotate(180deg);
          }
        }

        .vna-bowling-guy {
          transform-origin:
            center bottom;
          animation:
            vna-guy-bounce
            1s ease-in-out infinite;
        }

        @keyframes vna-guy-bounce {
          50% {
            transform:
              translateY(-5px);
          }
        }

        .vna-clap-left {
          transform-origin:
            390px 184px;
          animation:
            vna-clap-left
            700ms ease-in-out infinite;
        }

        .vna-clap-right {
          transform-origin:
            428px 183px;
          animation:
            vna-clap-right
            700ms ease-in-out infinite;
        }

        @keyframes vna-clap-left {
          50% {
            transform: rotate(10deg);
          }
        }

        @keyframes vna-clap-right {
          50% {
            transform: rotate(-10deg);
          }
        }

        .vna-stars {
          transform-origin: center;
          animation:
            vna-stars
            1.1s ease-in-out infinite;
        }

        @keyframes vna-stars {
          50% {
            transform: scale(1.08);
          }
        }

        .vna-giraffe {
          transform-origin:
            center bottom;
          animation:
            vna-giraffe
            2.2s ease-in-out infinite;
        }

        @keyframes vna-giraffe {
          50% {
            transform:
              translateY(-3px)
              rotate(-2deg);
          }
        }

        .vna-elephant {
          animation:
            vna-elephant
            2s ease-in-out infinite;
        }

        @keyframes vna-elephant {
          50% {
            transform:
              translateY(-4px);
          }
        }

        .vna-zoo-girl {
          transform-origin:
            center bottom;
          animation:
            vna-zoo-girl
            1.5s ease-in-out infinite;
        }

        @keyframes vna-zoo-girl {
          50% {
            transform:
              translateY(-3px)
              rotate(-1deg);
          }
        }

        .vna-point {
          transform-origin:
            302px 195px;
          animation:
            vna-point
            1.5s ease-in-out infinite;
        }

        @keyframes vna-point {
          50% {
            transform: rotate(-7deg);
          }
        }

        .vna-camera-flash {
          transform-origin:
            center;
          animation:
            vna-flash
            1.5s steps(2) infinite;
        }

        @keyframes vna-flash {
          50% {
            opacity: 0;
            transform: scale(1.2);
          }
        }

        @media (max-width: 390px) {
          .vna-stage {
            height: 270px;
          }

          .vna-scene {
            inset: 9px;
          }
        }

        @media (
          prefers-reduced-motion:
          reduce
        ) {
          .vna-scene-one {
            opacity: 1;
            transform: none;
          }

          .vna-scene-two,
          .vna-scene-three,
          .vna-scene-four {
            display: none;
          }

          .vna-root * {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}