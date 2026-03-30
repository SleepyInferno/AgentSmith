import type { NetworkMap } from "../../lib/network";

type NetworkRelationshipLegendProps = {
  map: NetworkMap;
};

export function NetworkRelationshipLegend({ map }: NetworkRelationshipLegendProps) {
  const confirmedCount = map.relationships.filter((relationship) => relationship.confidence === "confirmed").length;
  const inferredCount = map.relationships.filter((relationship) => relationship.confidence === "inferred").length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={legendRowStyle}>
        <span style={{ ...legendSwatchStyle, borderTop: "3px solid #0f766e" }} />
        <div>
          <strong style={{ display: "block", color: "#dff4d3" }}>Confirmed relationship</strong>
          <span style={legendCopyStyle}>
            These links come directly from a trusted source record and can be reviewed as authoritative until freshness
            drops.
          </span>
        </div>
        <strong style={legendCountStyle}>{confirmedCount}</strong>
      </div>

      <div style={legendRowStyle}>
        <span
          style={{
            ...legendSwatchStyle,
            borderTop: "3px dashed #b45309",
          }}
        />
        <div>
          <strong style={{ display: "block", color: "#dff4d3" }}>Inferred relationship</strong>
          <span style={legendCopyStyle}>
            These links are useful hints, but they still need operator confirmation before you treat them as hard truth.
          </span>
        </div>
        <strong style={legendCountStyle}>{inferredCount}</strong>
      </div>
    </div>
  );
}

const legendRowStyle = {
  display: "grid",
  gridTemplateColumns: "64px minmax(0, 1fr) auto",
  gap: 14,
  alignItems: "center",
  padding: 16,
  borderRadius: 18,
  background: "rgba(10, 17, 11, 0.97)",
  border: "1px solid rgba(148, 163, 184, 0.16)",
};

const legendSwatchStyle = {
  display: "block",
  width: 52,
  height: 0,
};

const legendCopyStyle = {
  color: "#9eb79b",
  lineHeight: 1.6,
};

const legendCountStyle = {
  minWidth: 34,
  textAlign: "right" as const,
  color: "#dff4d3",
};
