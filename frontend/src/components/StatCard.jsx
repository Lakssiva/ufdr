function StatCard({ title, value, subtitle, tone }) {
  return (
    <article className={`stat-card${tone ? ` tone-${tone}` : ""}`}>
      <h4>{title}</h4>
      <h2>{value}</h2>
      <p>{subtitle}</p>
    </article>
  );
}

export default StatCard;
