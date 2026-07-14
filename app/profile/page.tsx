const settings = [
  ["🎯", "Interests", "Live music, food, date nights"],
  ["💵", "Budget", "Usually under $80 for two"],
  ["📬", "Newsletter", "Venture This Weekend"],
  ["🏪", "Business portal", "Claim or submit a listing"],
  ["🧹", "Clear local history", "Remove device preferences"]
];

export default function ProfilePage() {
  return (
    <>
      <section className="profile-card"><div>PM</div><span>VENTURE PROFILE</span><h1>Prince</h1><p>Winnipeg · Guest preferences stored locally</p></section>
      <section className="settings-list">
        {settings.map(([icon, title, copy]) => <button key={title} type="button"><b>{icon}</b><span><strong>{title}</strong><small>{copy}</small></span><i>›</i></button>)}
      </section>
    </>
  );
}
