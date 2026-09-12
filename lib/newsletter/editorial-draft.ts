export const newsletterEditorialSections = [
  "the_move",
  "this_weekend",
  "lowkey",
  "new_on_venture",
  "next_week",
  "boogie_bangers",
  "custom"
] as const;

export type NewsletterEditorialSection =
  (typeof newsletterEditorialSections)[number];

export type NewsletterEditorialItem = {
  id?: string;
  section: NewsletterEditorialSection;
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  editorNote: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  venueName: string;
  sortOrder: number;
};

export type NewsletterEditorialIssue = {
  id?: string;
  title: string;
  subject: string;
  preheader: string;
  intro: string;
  closingNote: string;
  items: NewsletterEditorialItem[];
};

export const newsletterEditorialSectionLabels: Record<
  NewsletterEditorialSection,
  string
> = {
  the_move: "The Move",
  this_weekend: "This Weekend",
  lowkey: "Lowkey",
  new_on_venture: "New on Venture",
  next_week: "Next Week",
  boogie_bangers: "From Boogie Bangers",
  custom: "More to Know"
};

export function emptyNewsletterEditorialItem(
  sortOrder = 10
): NewsletterEditorialItem {
  return {
    section: "this_weekend",
    title: "",
    description: "",
    url: "",
    imageUrl: "",
    editorNote: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    venueName: "",
    sortOrder
  };
}
