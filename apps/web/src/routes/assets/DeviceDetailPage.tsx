import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { PageTitle } from "../../components/PageTitle";
import { RiskSignalList } from "../../components/assets/RiskSignalList";
import { getDeviceDetail } from "../../lib/assets";

function valueOrUnknown(value: string | number | null) {
  if (value === null || value === "") {
    return "Unknown";
  }

  return value;
}

export function DeviceDetailPage() {
  const { deviceId = "" } = useParams();
  const detailQuery = useQuery({
    queryKey: ["device-detail", deviceId],
    queryFn: () => getDeviceDetail(deviceId),
    enabled: deviceId.length > 0,
  });

  const detail = detailQuery.data;

  if (detailQuery.isPending) {
    return <div style={panelStyle}>Loading device detail...</div>;
  }

  if (detailQuery.isError || !detail) {
    return <div style={panelStyle}>Unable to load the selected device.</div>;
  }

  const freshnessWarning =
    detail.sourceFreshnessState !== "healthy" ? "Asset data is stale or incomplete" : null;

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <PageTitle title="Device Detail" />
      <article
        style={{
          padding: 24,
          borderRadius: 24,
          background: "rgba(10, 17, 11, 0.97)",
          border: "1px solid rgba(148, 163, 184, 0.22)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, color: "#dff4d3", fontSize: 14, textTransform: "uppercase", letterSpacing: "0.14em" }}>
              Device detail
            </p>
            <h2 style={{ margin: "10px 0 8px", fontSize: "2rem" }}>{detail.deviceName}</h2>
            <p style={{ margin: 0, color: "#9eb79b", lineHeight: 1.6 }}>
              {detail.summary ?? "No summary returned by the asset API."}
            </p>
          </div>
          <Link to="/devices" style={{ color: "#dff4d3", fontWeight: 700 }}>
            Back to inventory
          </Link>
        </div>
        {freshnessWarning ? (
          <div
            style={{
              marginTop: 18,
              padding: 16,
              borderRadius: 18,
              background: "rgba(244, 192, 73, 0.08)",
              color: "#9a3412",
            }}
          >
            {freshnessWarning}
          </div>
        ) : null}
      </article>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 20,
        }}
      >
        <article style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Risk summary</h3>
          <div style={{ display: "grid", gap: 10, color: "#9eb79b" }}>
            <div>riskLevel: {valueOrUnknown(detail.riskLevel)}</div>
            <div>riskScore: {valueOrUnknown(detail.riskScore)}</div>
            <div>queueRank: {valueOrUnknown(detail.queueRank)}</div>
            <div>ownerDisplayName: {valueOrUnknown(detail.ownerDisplayName)}</div>
            <div>department: {valueOrUnknown(detail.department)}</div>
            <div>site: {valueOrUnknown(detail.site)}</div>
          </div>
        </article>
        <article style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Data freshness</h3>
          <div style={{ display: "grid", gap: 10, color: "#9eb79b" }}>
            <div>sourceFreshnessState: {valueOrUnknown(detail.sourceFreshnessState)}</div>
            <div>lastCheckInAt: {valueOrUnknown(detail.lastCheckInAt)}</div>
            <div>calculatedAt: {valueOrUnknown(detail.calculatedAt)}</div>
            <div>sourceSystem: {valueOrUnknown(detail.sourceSystem)}</div>
            <div>sourceId: {valueOrUnknown(detail.sourceId)}</div>
          </div>
        </article>
      </section>

      <article style={panelStyle}>
        <h3 style={{ marginTop: 0 }}>Signals</h3>
        <RiskSignalList signals={detail.signals} />
      </article>

      <article style={panelStyle}>
        <h3 style={{ marginTop: 0 }}>Normalized health fields</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            color: "#9eb79b",
          }}
        >
          <div>encryptionStatus: {valueOrUnknown(detail.encryptionStatus)}</div>
          <div>antivirusStatus: {valueOrUnknown(detail.antivirusStatus)}</div>
          <div>patchStatus: {valueOrUnknown(detail.patchStatus)}</div>
          <div>lastCheckInAt: {valueOrUnknown(detail.lastCheckInAt)}</div>
          <div>sourceFreshnessState: {valueOrUnknown(detail.sourceFreshnessState)}</div>
          <div>operatingSystem: {valueOrUnknown(detail.operatingSystem)}</div>
          <div>serialNumber: {valueOrUnknown(detail.serialNumber)}</div>
          <div>supportStatus: {valueOrUnknown(detail.supportStatus)}</div>
          <div>deviceAgeDays: {valueOrUnknown(detail.deviceAgeDays)}</div>
          <div>diskFreePercent: {valueOrUnknown(detail.diskFreePercent)}</div>
          <div>complianceState: {valueOrUnknown(detail.complianceState)}</div>
          <div>ownerEmail: {valueOrUnknown(detail.ownerEmail)}</div>
        </div>
      </article>

      <article style={panelStyle}>
        <h3 style={{ marginTop: 0 }}>Compliance Policies</h3>
        {!detail.complianceAssignments || detail.complianceAssignments.length === 0 ? (
          <p style={{ color: "#9eb79b" }}>No compliance policies assigned</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "rgba(129, 255, 164, 0.08)" }}>
                <tr>
                  <th style={thStyle}>Policy</th>
                  <th style={thStyle}>Platform</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Last reported</th>
                </tr>
              </thead>
              <tbody>
                {detail.complianceAssignments.map((a, i) => (
                  <tr key={i} style={{ borderTop: "1px solid rgba(226, 232, 240, 0.9)" }}>
                    <td style={tdStyle}>{a.policyName}</td>
                    <td style={tdStyle}>{a.platform}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          background:
                            a.status === "compliant"
                              ? "#dcfce7"
                              : a.status === "nonCompliant"
                                ? "#fecaca"
                                : "rgba(129, 255, 164, 0.08)",
                          color:
                            a.status === "compliant"
                              ? "#166534"
                              : a.status === "nonCompliant"
                                ? "#7f1d1d"
                                : "#9eb79b",
                        }}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {a.lastReportedAt ? new Date(a.lastReportedAt).toLocaleString() : "Unknown"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}

const panelStyle = {
  padding: 24,
  borderRadius: 24,
  background: "rgba(10, 17, 11, 0.97)",
  border: "1px solid rgba(148, 163, 184, 0.22)",
};

const thStyle = {
  textAlign: "left" as const,
  padding: "14px 16px",
  color: "#9eb79b",
  fontSize: 13,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const tdStyle = {
  padding: "14px 16px",
  color: "#dff4d3",
  verticalAlign: "top" as const,
};
