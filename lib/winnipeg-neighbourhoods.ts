export type WinnipegNeighbourhoodGroup = {
  label: string;
  options: readonly string[];
};

export const POPULAR_WINNIPEG_NEIGHBOURHOODS = [
  "Downtown",
  "The Forks",
  "Exchange District",
  "Osborne Village",
  "Corydon",
  "St. Boniface",
  "West End",
  "Bridgwater",
  "River Heights",
  "St. Vital",
  "St. James",
  "Transcona"
] as const;

export const WINNIPEG_NEIGHBOURHOOD_GROUPS:
  readonly WinnipegNeighbourhoodGroup[] = [
    {
      label: "Central Winnipeg",
      options: [
        "Downtown",
        "The Forks",
        "Exchange District",
        "Chinatown",
        "Central Park",
        "Centennial",
        "Portage-Ellice",
        "Point Douglas",
        "South Point Douglas",
        "West Broadway",
        "West End",
        "Wolseley",
        "Spence",
        "Daniel McIntyre",
        "West Alexander",
        "North End"
      ]
    },
    {
      label: "Southwest Winnipeg",
      options: [
        "Osborne Village",
        "South Osborne",
        "Corydon",
        "River Heights",
        "Tuxedo",
        "Charleswood",
        "Fort Garry",
        "Fort Richmond",
        "St. Norbert",
        "Pembina Strip",
        "University of Manitoba",
        "Waverley Heights",
        "Richmond West",
        "Whyte Ridge",
        "Linden Woods",
        "Linden Ridge",
        "Waverley West",
        "Bridgwater",
        "Bridgwater Centre",
        "Bridgwater Forest",
        "Bridgwater Lakes",
        "Bridgwater Trails",
        "Prairie Pointe",
        "South Pointe",
        "South Winnipeg"
      ]
    },
    {
      label: "Southeast Winnipeg",
      options: [
        "St. Boniface",
        "Norwood",
        "Old St. Vital",
        "St. Vital",
        "St. George",
        "Windsor Park",
        "Southdale",
        "Sage Creek",
        "Island Lakes",
        "Royalwood",
        "River Park South",
        "Meadowood",
        "Dakota",
        "Niakwa Place",
        "Southland Park"
      ]
    },
    {
      label: "West Winnipeg",
      options: [
        "St. James",
        "Assiniboia",
        "Polo Park",
        "Deer Lodge",
        "Silver Heights",
        "Birchwood",
        "Woodhaven",
        "Westwood",
        "Crestview",
        "Heritage Park",
        "Bruce Park",
        "King Edward",
        "Kensington",
        "Glendale",
        "Airport"
      ]
    },
    {
      label: "Northwest and North Winnipeg",
      options: [
        "Garden City",
        "The Maples",
        "Seven Oaks",
        "West Kildonan",
        "Riverbend",
        "Rivergrove",
        "Amber Trails",
        "Tyndall Park",
        "Inkster Gardens",
        "Mandalay West",
        "Leila North",
        "Jefferson",
        "Margaret Park",
        "Scotia Heights",
        "Luxton",
        "Mynarski",
        "Shaughnessy Park",
        "Brooklands",
        "Weston"
      ]
    },
    {
      label: "Northeast and East Winnipeg",
      options: [
        "Elmwood",
        "East Elmwood",
        "East Kildonan",
        "North Kildonan",
        "Transcona",
        "Kildonan Crossing",
        "Mission Gardens",
        "Canterbury Park",
        "Harbour View South",
        "Valley Gardens",
        "Munroe East",
        "Munroe West",
        "Rossmere",
        "Morse Place",
        "Chalmers",
        "Talbot-Grey",
        "Tyne-Tees",
        "Regent"
      ]
    }
  ] as const;

export const WINNIPEG_NEIGHBOURHOODS =
  Array.from(
    new Set(
      WINNIPEG_NEIGHBOURHOOD_GROUPS.flatMap(
        (group) => [...group.options]
      )
    )
  ).sort((left, right) =>
    left.localeCompare(right)
  );

const NEIGHBOURHOOD_ALIASES:
  Record<string, readonly string[]> = {
    "Bridgwater": [
      "bridgwater",
      "bridgewater",
      "bridgwater centre",
      "bridgwater forest",
      "bridgwater lakes",
      "bridgwater trails"
    ],
    "Corydon": [
      "corydon",
      "little italy"
    ],
    "Downtown": [
      "downtown",
      "city centre"
    ],
    "North End": [
      "north end",
      "north point douglas"
    ],
    "Osborne Village": [
      "osborne village"
    ],
    "South Osborne": [
      "south osborne",
      "lord roberts",
      "riverview"
    ],
    "South Winnipeg": [
      "south winnipeg",
      "waverley west",
      "fort garry",
      "fort richmond",
      "st norbert",
      "bridgwater",
      "bridgewater"
    ],
    "St. Boniface": [
      "st boniface",
      "saint boniface"
    ],
    "St. James": [
      "st james",
      "saint james",
      "st james assiniboia"
    ],
    "St. Norbert": [
      "st norbert",
      "saint norbert"
    ],
    "St. Vital": [
      "st vital",
      "saint vital",
      "old st vital"
    ],
    "The Forks": [
      "the forks",
      "forks"
    ],
    "University of Manitoba": [
      "university of manitoba",
      "u of m",
      "um fort garry"
    ],
    "West End": [
      "west end"
    ]
  };

export function normalizeNeighbourhood(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/saint/g, "st")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findWinnipegNeighbourhood(
  value: string
): string | null {
  const normalized =
    normalizeNeighbourhood(value);

  if (!normalized) {
    return null;
  }

  const exact =
    WINNIPEG_NEIGHBOURHOODS.find(
      (option) =>
        normalizeNeighbourhood(option) ===
        normalized
    );

  if (exact) {
    return exact;
  }

  const aliasMatch =
    Object.entries(
      NEIGHBOURHOOD_ALIASES
    ).find(
      ([canonical, aliases]) =>
        normalizeNeighbourhood(
          canonical
        ) === normalized ||
        aliases.some(
          (alias) =>
            normalizeNeighbourhood(
              alias
            ) === normalized
        )
    );

  return aliasMatch?.[0] ?? null;
}

export function neighbourhoodMatchesPreference(
  listingNeighbourhood: string,
  preference: string
): boolean {
  const listing =
    normalizeNeighbourhood(
      listingNeighbourhood
    );
  const preferred =
    normalizeNeighbourhood(preference);

  if (!listing || !preferred) {
    return false;
  }

  if (
    listing === preferred ||
    listing.includes(preferred) ||
    preferred.includes(listing)
  ) {
    return true;
  }

  const aliases =
    NEIGHBOURHOOD_ALIASES[
      findWinnipegNeighbourhood(
        preference
      ) ?? preference
    ] ?? [];

  return aliases.some((alias) => {
    const normalizedAlias =
      normalizeNeighbourhood(alias);

    return (
      listing === normalizedAlias ||
      listing.includes(
        normalizedAlias
      )
    );
  });
}

