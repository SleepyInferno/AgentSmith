type PageTitleProps = {
  title: string;
  eyebrow?: string;
};

export function PageTitle({ title, eyebrow }: PageTitleProps) {
  return (
    <div className="agent-page-title">
      {eyebrow ? <p className="agent-page-title__eyebrow">{eyebrow}</p> : null}
      <h1 className="agent-page-title__heading">{title}</h1>
    </div>
  );
}
