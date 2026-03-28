import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { BackupInventoryTable } from "../../components/backup/BackupInventoryTable";
import { getBackupInventory, type BackupInventoryParams } from "../../lib/backup";

type BackupInventoryPageProps = {
  trustBoundaryCopy: string;
};

const defaultTrustBoundaryCopy =
  "Read-only evidence view - no backup jobs, restores, or exceptions can be executed here.";

const confidenceStateOptions = ["healthy", "watch", "high_risk", "unknown"];
const coverageStateOptions = ["protected", "missing", "partial", "excluded", "unknown"];

function readParams(searchParams: URLSearchParams): BackupInventoryParams {
  const params: BackupInventoryParams = {};
  const search = searchParams.get("search");
  const confidenceState = searchParams.get("confidenceState");
  const coverageState = searchParams.get("coverageState");
  const providerKey = searchParams.get("providerKey");
  const siteName = searchParams.get("siteName");

  if (search) {
    params.search = search;
  }

  if (confidenceState) {
    params.confidenceState = confidenceState;
  }

  if (coverageState) {
    params.coverageState = coverageState;
  }

  if (providerKey) {
    params.providerKey = providerKey;
  }

  if (siteName) {
    params.siteName = siteName;
  }

  return params;
}

function FilterSelect(props: {
  label: string;
  name: string;
  value: string;
  options: string[];
  onChange: (name: string, value: string) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 8, color: "#334155", fontWeight: 600 }}>
      <span>{props.label}</span>
      <select
        value={props.value}
        onChange={(event) => props.onChange(props.name, event.target.value)}
        style={filterControlStyle}
      >
        <option value="">All</option>
        {props.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterInput(props: {
  label: string;
  name: string;
  value: string;
  placeholder: string;
  onChange: (name: string, value: string) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 8, color: "#334155", fontWeight: 600 }}>
      <span>{props.label}</span>
      <input
        value={props.value}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(props.name, event.target.value)}
        style={filterControlStyle}
      />
    </label>
  );
}

export function BackupInventoryPage({ trustBoundaryCopy }: BackupInventoryPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = readParams(searchParams);
  const inventoryQuery = useQuery({
    queryKey: ["backup-inventory", params],
    queryFn: () => getBackupInventory(params),
  });

  function updateFilter(name: string, value: string) {
    const nextParams = new URLSearchParams(searchParams);

    if (value) {
      nextParams.set(name, value);
    } else {
      nextParams.delete(name);
    }

    setSearchParams(nextParams);
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams());
  }

  const rows = inventoryQuery.data?.items ?? [];
  const isSeededExample = inventoryQuery.data?.dataMode === "seeded_example";
  const hasStaleTelemetry =
    rows.some((row) => row.sourceHealth?.state && row.sourceHealth.state !== "current") ||
    rows.some((row) => row.confidenceState === "unknown");

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <article style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={eyebrowStyle}>Backup inventory</p>
            <h2 style={{ margin: "10px 0 8px", fontSize: "2rem" }}>Protected-system inventory</h2>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.6, maxWidth: 780 }}>
              Filters stay server-driven and bookmarkable, so the queue, inventory, and future detail
              routes all use one backend-owned confidence view instead of React-side filtering.
            </p>
            <p style={{ margin: "12px 0 0", color: "#0f172a", fontWeight: 700 }}>
              {trustBoundaryCopy || defaultTrustBoundaryCopy}
            </p>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: hasStaleTelemetry ? "#fff7ed" : "#eff6ff",
              color: hasStaleTelemetry ? "#9a3412" : "#0f172a",
              maxWidth: 320,
            }}
          >
            {hasStaleTelemetry ? "Backup telemetry is stale or incomplete" : "Inventory is using current backup evidence"}
          </div>
        </div>

        {isSeededExample ? (
          <div
            style={{
              marginTop: 18,
              padding: "16px 18px",
              borderRadius: 18,
              background: "#fef3c7",
              color: "#92400e",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              fontWeight: 600,
            }}
          >
            Example backup data is shown until a live backup source is connected
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 20 }}>
          <FilterInput
            label="search"
            name="search"
            value={searchParams.get("search") ?? ""}
            placeholder="Finance SQL"
            onChange={updateFilter}
          />
          <FilterSelect
            label="confidenceState"
            name="confidenceState"
            value={searchParams.get("confidenceState") ?? ""}
            options={confidenceStateOptions}
            onChange={updateFilter}
          />
          <FilterSelect
            label="coverageState"
            name="coverageState"
            value={searchParams.get("coverageState") ?? ""}
            options={coverageStateOptions}
            onChange={updateFilter}
          />
          <FilterInput
            label="providerKey"
            name="providerKey"
            value={searchParams.get("providerKey") ?? ""}
            placeholder="veeam"
            onChange={updateFilter}
          />
          <FilterInput
            label="siteName"
            name="siteName"
            value={searchParams.get("siteName") ?? ""}
            placeholder="HQ"
            onChange={updateFilter}
          />
          <button
            type="button"
            onClick={clearFilters}
            style={{
              alignSelf: "end",
              height: 44,
              padding: "0 16px",
              borderRadius: 14,
              border: "1px solid rgba(148, 163, 184, 0.35)",
              background: "#f8fafc",
              color: "#0f172a",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Clear filters
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            padding: "14px 16px",
            borderRadius: 18,
            background: "#f8fafc",
            color: "#334155",
            border: "1px solid rgba(148, 163, 184, 0.16)",
          }}
        >
          Excluded by policy systems stay visible in inventory and out of the missing-coverage queue
        </div>
      </article>

      <section
        style={{
          ...panelStyle,
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Inventory navigation</h2>
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.6, maxWidth: 720 }}>
            Adjust filters here or head back to the queue-first overview when you want the ranked review list again.
          </p>
        </div>
        <Link
          to="/backup"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "12px 18px",
            borderRadius: 999,
            background: "#0f172a",
            color: "#f8fafc",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Back to backup overview
        </Link>
      </section>

      {inventoryQuery.isPending ? (
        <div style={panelStyle}>Loading backup inventory...</div>
      ) : inventoryQuery.isError ? (
        <div style={panelStyle}>Unable to load backup inventory right now.</div>
      ) : rows.length === 0 ? (
        <div style={panelStyle}>
          <strong style={{ display: "block", marginBottom: 8 }}>No protected systems match the current filters</strong>
          <span style={{ color: "#475569", lineHeight: 1.6 }}>
            Clear one or more filters to widen the protected-system review scope.
          </span>
        </div>
      ) : (
        <BackupInventoryTable rows={rows} />
      )}
    </section>
  );
}

const filterControlStyle = {
  minWidth: 170,
  borderRadius: 14,
  border: "1px solid rgba(148, 163, 184, 0.42)",
  padding: "10px 12px",
  background: "#ffffff",
};

const eyebrowStyle = {
  margin: 0,
  color: "#0369a1",
  fontSize: 13,
  textTransform: "uppercase" as const,
  letterSpacing: "0.14em",
  fontWeight: 700,
};

const panelStyle = {
  padding: 24,
  borderRadius: 24,
  background: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
};
