export function PaPlaceholder({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <>
      <div className="pa-page-header">
        <div>
          <div className="pa-eyebrow">{eyebrow}</div>
          <div className="pa-page-title">{title}</div>
          <div className="pa-page-desc">{description}</div>
        </div>
      </div>
      <div className="pa-coming-soon">
        <div className="pa-coming-soon-tag">Coming Soon</div>
        <div className="pa-coming-soon-title">{title}</div>
        <div className="pa-coming-soon-desc">{description}</div>
      </div>
    </>
  );
}
