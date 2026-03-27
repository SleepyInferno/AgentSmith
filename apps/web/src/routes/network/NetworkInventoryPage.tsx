import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { NetworkInventoryTable } from "../../components/network/NetworkInventoryTable";
import { getNetworkInventory, type NetworkInventoryParams } from "../../lib/network";

const kindOptions = [
  "site",
  "wan_link",
  "lan_segment",
  "firewall",
  "switch",
  "access_point",
  "dhcp_service",
  "vpn_service",
];

const freshnessOptions = ["healthy", "warning", "stale", "error"];

function readParams(searchParams: URLSearchParams): NetworkInventoryParams {
  const params: NetworkInventoryParams = {};
  const kind = searchParams.get("kind");
  const site = searchParams.get("site");
  const operationalStatus = searchParams.get("operationalStatus");
  const freshnessState = searchParams.get("freshnessState");

  if (kind) {
    params.kind = kind;
  }

  if (site) {
    params.site = site;
  }

  if (operationalStatus) {
    params.operationalStatus = operationalStatus;
  }

  if (freshnessState) {
    params.freshnessState = freshnessState;
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

export function NetworkInventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = readParams(searchParams);
  const inventoryQuery = useQuery({
    queryKey: ["network-inventory", params],
    queryFn: () => getNetworkInventory(params),
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
  const isStale = rows.some((row) => row.freshnessState !== "healthy");
  const isSeededExample = inventoryQuery.data?.dataMode === "seeded_example";

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <article style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={eyebrowStyle}>Network inventory</p>
            <h2 style={{ margin: "10px 0 8px", fontSize: "2rem" }}>Filterable network inventory</h2>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.6, maxWidth: 760 }}>
              Filters call the network API directly so the queue and inventory stay aligned with
              one server-owned view of freshness and scope.
            </p>
          </div>
          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: isStale ? "#fff7ed" : "#eff6ff",
              color: isStale ? "#9a3412" : "#0f172a",
              maxWidth: 280,
            }}
          >
            {isStale ? "Network data is stale or incomplete" : "Inventory is using current network data"}
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
            Example network data is shown until a live source is connected
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 20 }}>
          <FilterSelect
            label="kind"
            name="kind"
            value={searchParams.get("kind") ?? ""}
            options={kindOptions}
            onChange={updateFilter}
          />
          <FilterInput
            label="site"
            name="site"
            value={searchParams.get("site") ?? ""}
            placeholder="HQ"
            onChange={updateFilter}
          />
          <FilterInput
            label="operationalStatus"
            name="operationalStatus"
            value={searchParams.get("operationalStatus") ?? ""}
            placeholder="online"
            onChange={updateFilter}
          />
          <FilterSelect
            label="freshnessState"
            name="freshnessState"
            value={searchParams.get("freshnessState") ?? ""}
            options={freshnessOptions}
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
      </article>

      {inventoryQuery.isPending ? (
        <div style={panelStyle}>Loading network inventory...</div>
      ) : inventoryQuery.isError ? (
        <div style={panelStyle}>Unable to load network inventory right now.</div>
      ) : rows.length === 0 ? (
        <div style={panelStyle}>
          <strong style={{ display: "block", marginBottom: 8 }}>No network resources match the current filters</strong>
          <span style={{ color: "#475569", lineHeight: 1.6 }}>
            Clear one or more filters to widen the network review scope.
          </span>
        </div>
      ) : (
        <NetworkInventoryTable rows={rows} />
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
