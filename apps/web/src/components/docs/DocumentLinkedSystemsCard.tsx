import type { DocumentationLinkedSystem } from "../../lib/docs";

type DocumentLinkedSystemsCardProps = {
  linkedSystems: DocumentationLinkedSystem[];
  linkedSystemSummary: string;
};

export function DocumentLinkedSystemsCard({
  linkedSystems,
  linkedSystemSummary,
}: DocumentLinkedSystemsCardProps) {
  return (
    <article style={panelStyle}>
      <p style={eyebrowStyle}>Linked systems</p>
      <h3 style={{ margin: "10px 0 8px" }}>Linked systems</h3>
      <p style={{ margin: 0, color: "#9eb79b", lineHeight: 1.6 }}>{linkedSystemSummary}</p>

      {linkedSystems.length === 0 ? (
        <div style={emptyStateStyle}>
          No operational systems are linked to this record yet. The later metadata review flow can add explicit relationships with audit logging.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {linkedSystems.map((system) => (
            <article key={system.systemId} style={systemCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong style={{ display: "block", color: "#dff4d3", fontSize: "1rem" }}>{system.systemName}</strong>
                  <span style={{ color: "#9eb79b", lineHeight: 1.6 }}>{system.relationshipLabel}</span>
                </div>
                <span style={relationshipChipStyle}>{system.relationshipLabel}</span>
              </div>

              <div style={definitionGridStyle}>
                <DefinitionItem label="Category" value={system.category ?? "Unknown"} />
                <DefinitionItem label="Owner team" value={system.ownerTeam ?? "Unknown"} />
                <DefinitionItem label="Criticality" value={system.criticality ?? "Unknown"} />
              </div>
            </article>
          ))}
        </div>
      )}
    </article>
  );
}

function DefinitionItem(props: { label: string; value: string }) {
  return (
    <div style={definitionItemStyle}>
      <span style={labelStyle}>{props.label}</span>
      <strong style={{ color: "#dff4d3", lineHeight: 1.5 }}>{props.value}</strong>
    </div>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "#89ff93",
  fontSize: 13,
  textTransform: "uppercase" as const,
  letterSpacing: "0.14em",
  fontWeight: 700,
};

const panelStyle = {
  padding: 24,
  borderRadius: 24,
  background: "rgba(10, 17, 11, 0.97)",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
  display: "grid",
  gap: 16,
};

const systemCardStyle = {
  padding: 18,
  borderRadius: 20,
  background: "rgba(10, 17, 11, 0.97)",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  display: "grid",
  gap: 12,
};

const relationshipChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(59, 130, 246, 0.15)",
  color: "#93c5fd",
  fontSize: 12,
  fontWeight: 700,
};

const definitionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
};

const definitionItemStyle = {
  padding: 12,
  borderRadius: 16,
  background: "rgba(10, 17, 11, 0.97)",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  display: "grid",
  gap: 6,
};

const labelStyle = {
  color: "#9eb79b",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  fontWeight: 700,
};

const emptyStateStyle = {
  padding: "16px 18px",
  borderRadius: 18,
  background: "rgba(10, 17, 11, 0.97)",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  color: "#9eb79b",
  lineHeight: 1.6,
};
