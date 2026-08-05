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
      "Winnipeg this weekend: one solid plan and three reasons to leave home",
    preheader:
      "A focused Winnipeg roundup from Venture by Boogie Bangers.",
    intro:
      "This is the first proper Thursday Venture. The goal is simple: fewer tabs, less scrolling, and one email that helps you choose what to do in Winnipeg.",
    venturePickTitle:
      "A full evening without the planning spiral",
    venturePickBody:
      "Start with dinner somewhere worth sitting down for, add one activity nearby, then finish with a late drink or dessert. Venture can build the route around your budget and travel style.",
    venturePickUrl:
      "/build-outing",
    weekendTitle:
      "Three things worth checking before the weekend disappears",
    weekendBody:
      "Use Explore to filter for events, nightlife, food, free options, and places that are actually open when you need them.",
    weekendUrl:
      "/explore?time=this-weekend",
    budgetTitle:
      "Keep the outing under control",
    budgetBody:
      "Try the Cheap filter, choose walking or transit, and build around one paid stop instead of letting every part of the night nibble at your wallet.",
    budgetUrl:
      "/explore?price=cheap",
    closingNote:
      "Venture is still growing, so replies are useful. Tell us what you wanted to find, what felt missing, or what part of Winnipeg deserves a better spotlight."
  };
