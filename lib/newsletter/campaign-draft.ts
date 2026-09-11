export type VentureNewsletterDraft = {
  issueLabel: string;
  subject: string;
  preheader: string;
  intro: string;
  venturePickTitle: string;
  venturePickBody: string;
  venturePickUrl: string;
  weekendTitle: string;
  weekendBody: string;
  weekendUrl: string;
  budgetTitle: string;
  budgetBody: string;
  budgetUrl: string;
  closingNote: string;
};

export const defaultVentureNewsletterDraft:
  VentureNewsletterDraft = {
    issueLabel:
      "Issue 001 · Winnipeg Weekend Starter",
    subject:
      "Winnipeg this weekend: what is actually worth knowing about",
    preheader:
      "A focused Winnipeg city digest from Venture by Boogie Bangers.",
    intro:
      "This is The Thursday Venture: one Winnipeg city edit built from the places people actually post. Events, nightlife, food, culture, free finds, openings, and smaller things worth knowing before the weekend starts.",
    venturePickTitle:
      "The one thing leading Winnipeg this week",
    venturePickBody:
      "Use this space for the city-scale moment, standout event, or story that deserves to lead the issue. Keep it specific, timely, and useful enough that someone could decide to go from this paragraph alone.",
    venturePickUrl:
      "/explore",
    weekendTitle:
      "What is happening this weekend",
    weekendBody:
      "Pull together the strongest mix across music, parties, sports, comedy, food, markets, culture, community events, and anything else Winnipeg should know about now.",
    weekendUrl:
      "/explore?time=this-weekend",
    budgetTitle:
      "Lowkey and free finds",
    budgetBody:
      "Use this lane for free events, smaller rooms, neighbourhood happenings, niche ideas, and the kind of Winnipeg thing people usually hear about after it is over.",
    budgetUrl:
      "/explore?price=cheap",
    closingNote:
      "Venture is still growing, so replies are useful. Send us the event, opening, party, pop-up, community thing, or strange little Winnipeg find we should have caught."
  };
