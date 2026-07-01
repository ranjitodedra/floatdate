/** Bump when replacing files in public/assets/Universities-icons */
export const UNIVERSITY_ICON_VERSION = "20260630";

export function universityIconSrc(path: string): string {
  return `${path}?v=${UNIVERSITY_ICON_VERSION}`;
}

export const UNIVERSITY_ICONS = {
  laurier: "/assets/Universities-icons/laurier.png",
  waterloo: "/assets/Universities-icons/waterloo.png",
  uoft: "/assets/Universities-icons/uoft.png",
  western: "/assets/Universities-icons/western.png",
  mcmaster: "/assets/Universities-icons/mcmaster.png",
  uottawa: "/assets/Universities-icons/uottawa.png",
  queens: "/assets/Universities-icons/queens.png",
} as const;

export const UNIVERSITIES = [
  {
    name: "Wilfrid Laurier University",
    domain: "mylaurier.ca",
    image: UNIVERSITY_ICONS.laurier,
  },
  {
    name: "University of Waterloo",
    domain: "uwaterloo.ca",
    image: UNIVERSITY_ICONS.waterloo,
  },
  {
    name: "University of Toronto",
    domain: "mail.utoronto.ca",
    image: UNIVERSITY_ICONS.uoft,
  },
  {
    name: "Western University",
    domain: "uwo.ca",
    image: UNIVERSITY_ICONS.western,
  },
  {
    name: "McMaster University",
    domain: "mcmaster.ca",
    image: UNIVERSITY_ICONS.mcmaster,
  },
  {
    name: "University of Ottawa",
    domain: "uottawa.ca",
    image: UNIVERSITY_ICONS.uottawa,
  },
  {
    name: "Queen's University",
    domain: "queensu.ca",
    image: UNIVERSITY_ICONS.queens,
  },
] as const;

export const UNIVERSITY_LOGO_IMAGES = UNIVERSITIES.map((uni) =>
  universityIconSrc(uni.image)
);
