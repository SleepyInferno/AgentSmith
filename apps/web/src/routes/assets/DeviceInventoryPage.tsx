import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { DeviceInventoryTable } from "../../components/assets/DeviceInventoryTable";
import { getDeviceInventory, type DeviceInventoryParams } from "../../lib/assets";

function readParams(searchParams: URLSearchParams): DeviceInventoryParams {
  const params: DeviceInventoryParams = {};
  const riskLevel = searchParams.get("riskLevel");
  const riskSignal = searchParams.get("riskSignal");
  const encryptionStatus = searchParams.get("encryptionStatus");
  const antivirusStatus = searchParams.get("antivirusStatus");
  const patchStatus = searchParams.get("patchStatus");
  const sortField = searchParams.get("sortField");
  const sortDirection = searchParams.get("sortDirection");

  if (riskLevel) {
    params.riskLevel = riskLevel;
  }

  if (riskSignal) {
    params.riskSignal = riskSignal;
  }

  if (encryptionStatus) {
    params.encryptionStatus = encryptionStatus;
  }

  if (antivirusStatus) {
    params.antivirusStatus = antivirusStatus;
  }

  if (patchStatus) {
    params.patchStatus = patchStatus;
  }

  params.sortField =
    sortField === "riskScore" ||
    sortField === "lastCheckInAt" ||
    sortField === "deviceName" ||
    sortField === "operatingSystem"
      ? sortField
      : "riskScore";

  params.sortDirection = sortDirection === "asc" || sortDirection === "desc" ? sortDirection : "desc";

  if (searchParams.get("staleOnly") === "true") {
    params.staleOnly = true;
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
        style={{
          minWidth: 160,
          borderRadius: 14,
          border: "1px solid rgba(148, 163, 184, 0.42)",
          padding: "10px 12px",
          background: "#ffffff",
        }}
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

export function DeviceInventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = readParams(searchParams);
  const inventoryQuery = useQuery({
    queryKey: ["device-inventory", params],
    queryFn: () => getDeviceInventory(params),
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

  function updateStaleOnly(value: boolean) {
    const nextParams = new URLSearchParams(searchParams);

    if (value) {
      nextParams.set("staleOnly", "true");
    } else {
      nextParams.delete("staleOnly");
    }

    setSearchParams(nextParams);
  }

  const rows = inventoryQuery.data ?? [];

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <article
        style={{
          padding: 24,
          borderRadius: 24,
          background: "#ffffff",
          border: "1px solid rgba(148, 163, 184, 0.22)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, color: "#0f172a", fontSize: 14, textTransform: "uppercase", letterSpacing: "0.14em" }}>
              Device inventory
            </p>
            <h2 style={{ margin: "10px 0 8px", fontSize: "2rem" }}>Filterable device inventory</h2>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
              Filters call the asset API directly so queue and inventory rankings stay aligned.
            </p>
          </div>
          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background:
                rows.some((row) => row.sourceFreshnessState !== "healthy") ? "#fff7ed" : "#eff6ff",
              color: "#334155",
            }}
          >
            {rows.some((row) => row.sourceFreshnessState !== "healthy")
              ? "Asset data is stale or incomplete"
              : "Inventory is using current source data"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 20 }}>
          <FilterSelect
            label="riskLevel"
            name="riskLevel"
            value={searchParams.get("riskLevel") ?? ""}
            options={["critical", "high", "watch", "low"]}
            onChange={updateFilter}
          />
          <FilterSelect
            label="sortField"
            name="sortField"
            value={params.sortField ?? "riskScore"}
            options={["riskScore", "lastCheckInAt", "deviceName", "operatingSystem"]}
            onChange={updateFilter}
          />
          <FilterSelect
            label="sortDirection"
            name="sortDirection"
            value={params.sortDirection ?? "desc"}
            options={["desc", "asc"]}
            onChange={updateFilter}
          />
          <FilterSelect
            label="riskSignal"
            name="riskSignal"
            value={searchParams.get("riskSignal") ?? ""}
            options={["stale_check_in", "missing_encryption", "missing_antivirus", "missing_patch", "unsupported_os", "low_disk", "old_device", "data_incomplete"]}
            onChange={updateFilter}
          />
          <FilterSelect
            label="encryptionStatus"
            name="encryptionStatus"
            value={searchParams.get("encryptionStatus") ?? ""}
            options={["healthy", "warning", "missing", "unknown", "unsupported"]}
            onChange={updateFilter}
          />
          <FilterSelect
            label="antivirusStatus"
            name="antivirusStatus"
            value={searchParams.get("antivirusStatus") ?? ""}
            options={["healthy", "warning", "missing", "unknown", "unsupported"]}
            onChange={updateFilter}
          />
          <FilterSelect
            label="patchStatus"
            name="patchStatus"
            value={searchParams.get("patchStatus") ?? ""}
            options={["healthy", "warning", "missing", "unknown", "unsupported"]}
            onChange={updateFilter}
          />
          <label style={{ display: "grid", gap: 8, color: "#334155", fontWeight: 600 }}>
            <span>staleOnly</span>
            <input
              type="checkbox"
              checked={searchParams.get("staleOnly") === "true"}
              onChange={(event) => updateStaleOnly(event.target.checked)}
              style={{ width: 18, height: 18 }}
            />
          </label>
        </div>
      </article>

      {inventoryQuery.isPending ? (
        <div style={panelStyle}>Loading inventory...</div>
      ) : inventoryQuery.isError ? (
        <div style={panelStyle}>Unable to load inventory right now.</div>
      ) : rows.length === 0 ? (
        <div style={panelStyle}>
          <strong style={{ display: "block", marginBottom: 8 }}>No devices match the current filters</strong>
          <span style={{ color: "#475569", lineHeight: 1.6 }}>
            Clear one or more filters to widen the triage view.
          </span>
        </div>
      ) : (
        <DeviceInventoryTable rows={rows} />
      )}
    </section>
  );
}

const panelStyle = {
  padding: 24,
  borderRadius: 24,
  background: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.22)",
};
