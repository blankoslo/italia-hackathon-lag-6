export interface RouteLeg {
  utnoId: string;
  fromCabin: string;
  toCabin: string;
}

export interface ClassicRoute {
  id: string;
  name: string;
  area: string;
  tagline: string;
  legs: RouteLeg[];
  difficulty: string;
  multiDay?: boolean;
  totalDistanceKm: number;
  durationDays?: number;
  durationHours?: number;
}

export const CLASSIC_ROUTES: ClassicRoute[] = [
  {
    id: "jotunheimrunden",
    name: "Jotunheimrunden",
    area: "Jotunheimen",
    tagline: "Klassisk 3-dagers tur via Besseggen, Gjendebu og Leirvassbu",
    legs: [
      { utnoId: "135600",   fromCabin: "Gjendesheim", toCabin: "Memurubu" },
      { utnoId: "13394481", fromCabin: "Memurubu",    toCabin: "Gjendebu" },
      { utnoId: "135865",   fromCabin: "Gjendebu",    toCabin: "Leirvassbu" },
    ],
    difficulty: "VERY_TOUGH",
    multiDay: true,
    totalDistanceKm: 44,
    durationDays: 3,
  },
  {
    id: "hardangervidda",
    name: "Hardangervidda-kryssing",
    area: "Hardangervidda",
    tagline: "Ikonisk viddetraverset fra Finse via Krækkja til Halne",
    legs: [
      { utnoId: "13394408", fromCabin: "Finsehytta", toCabin: "Krækkja" },
      { utnoId: "136330",   fromCabin: "Krækkja",    toCabin: "Halne" },
    ],
    difficulty: "TOUGH",
    multiDay: true,
    totalDistanceKm: 46,
    durationDays: 3,
  },
  {
    id: "besseggen",
    name: "Besseggen",
    area: "Jotunheimen",
    tagline: "Norges mest kjente dagtur — smalt egg mellom to innsjøer",
    legs: [
      { utnoId: "135600", fromCabin: "Gjendesheim", toCabin: "Memurubu" },
    ],
    difficulty: "VERY_TOUGH",
    totalDistanceKm: 13.9,
    durationHours: 7,
  },
  {
    id: "romsdalseggen",
    name: "Romsdalseggen",
    area: "Romsdalen",
    tagline: "Spektakulær eggevandring over Åndalsnes med fjordutsikt",
    legs: [
      { utnoId: "1343066", fromCabin: "Venjesdalen", toCabin: "Åndalsnes" },
    ],
    difficulty: "TOUGH",
    totalDistanceKm: 10.8,
    durationHours: 7,
  },
  {
    id: "trolltunga",
    name: "Trolltunga",
    area: "Hardanger",
    tagline: "Ikonisk fjellhylle 700 m over Ringedalsvatnet",
    legs: [
      { utnoId: "136059", fromCabin: "Skjeggedal", toCabin: "Trolltunga" },
    ],
    difficulty: "TOUGH",
    totalDistanceKm: 22,
    durationHours: 10,
  },
  {
    id: "galdhopiggen",
    name: "Galdhøpiggen",
    area: "Jotunheimen",
    tagline: "Toppen av Norge — Skandinavias høyeste fjell på 2469 moh.",
    legs: [
      { utnoId: "135848", fromCabin: "Spiterstulen", toCabin: "Galdhøpiggen" },
    ],
    difficulty: "TOUGH",
    totalDistanceKm: 10,
    durationHours: 8,
  },
  {
    id: "snohetta",
    name: "Snøhetta",
    area: "Dovrefjell",
    tagline: "Vill topp i Dovrefjell nasjonalpark — moskusokser i terrenget",
    legs: [
      { utnoId: "136070", fromCabin: "Snøheim", toCabin: "Snøhetta" },
    ],
    difficulty: "MODERATE",
    totalDistanceKm: 9,
    durationHours: 5,
  },
];

export const DIFFICULTY_BADGE: Record<string, { label: string; className: string }> = {
  EASY:       { label: "Enkel",          className: "bg-green-100 text-green-800" },
  MODERATE:   { label: "Middels",        className: "bg-yellow-100 text-yellow-800" },
  TOUGH:      { label: "Krevende",       className: "bg-orange-100 text-orange-800" },
  VERY_TOUGH: { label: "Meget krevende", className: "bg-red-100 text-red-800" },
};
