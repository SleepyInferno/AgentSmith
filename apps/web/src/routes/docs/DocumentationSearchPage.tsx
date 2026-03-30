import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { PageTitle } from "../../components/PageTitle";
import { DocumentationSearchResultsTable } from "../../components/docs/DocumentationSearchResultsTable";
import { docsQueryKeys, searchDocumentation, type DocumentationSearchParams } from "../../lib/docs";

type DocumentationSearchPageProps = {
  trustBoundaryCopy: string;
};

const kindOptions = ["sop", "vendor_note", "contact", "infrastructure_note", "recovery_procedure"];
const reviewStateOptions = ["current", "due_soon", "overdue", "unreviewed"];

function readParams(searchParams: URLSearchParams): DocumentationSearchParams {
  const params: DocumentationSearchParams = {};
  const q = searchParams.get("q");
  const kind = searchParams.get("kind");
  const category = searchParams.get("category");
  const site = searchParams.get("site");
  const owner = searchParams.get("owner");
  const systemId = searchParams.get("systemId");
  const reviewState = searchParams.get("reviewState");

  if (q) {
    params.q = q;
  }

  if (kind) {
    params.kind = kind;
  }

  if (category) {
    params.category = category;
  }

  if (site) {
    params.site = site;
  }

  if (owner) {
    params.owner = owner;
  }

  if (systemId) {
    params.systemId = systemId;
  }

  if (reviewState) {
    params.reviewState = reviewState;
  }

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
    <label style={{ display: "grid", gap: 8, color: "#9eb79b", fontWeight: 600 }}>
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
    <label style={{ display: "grid", gap: 8, color: "#9eb79b", fontWeight: 600 }}>
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

export function DocumentationSearchPage({ trustBoundaryCopy }: DocumentationSearchPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = readParams(searchParams);
  const searchQuery = useQuery({
    queryKey: docsQueryKeys.search(params),
    queryFn: () => searchDocumentation(params),
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

  function updateStaleOnly(nextValue: boolean) {
    const nextParams = new URLSearchParams(searchParams);

    if (nextValue) {
      nextParams.set("staleOnly", "true");
    } else {
      nextParams.delete("staleOnly");
    }

    setSearchParams(nextParams);
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams());
  }

  const response = searchQuery.data;
  const rows = response?.results ?? [];
  const searchValue = searchParams.get("q") ?? "";
  const isSeededExample = response?.dataMode === "seeded_example";

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <PageTitle title="Documentation Search" />
      <article style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={eyebrowStyle}>Search inventory</p>
            <h2 style={{ margin: "10px 0 8px", fontSize: "2rem" }}>Search inventory</h2>
            <p style={{ margin: 0, color: "#9eb79b", lineHeight: 1.6, maxWidth: 760 }}>
              Filters stay bookmarkable because URL params flow directly into the server-owned docs
              search contract instead of filtering rows in memory.
            </p>
          </div>
          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: "#eff6ff",
              color: "#dff4d3",
              maxWidth: 320,
            }}
          >
            {trustBoundaryCopy}
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
            Example documentation records are shown until a live source is connected
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 20 }}>
          <FilterInput
            label="q"
            name="q"
            value={searchParams.get("q") ?? ""}
            placeholder="sharepoint restore"
            onChange={updateFilter}
          />
          <FilterSelect
            label="kind"
            name="kind"
            value={searchParams.get("kind") ?? ""}
            options={kindOptions}
            onChange={updateFilter}
          />
          <FilterInput
            label="category"
            name="category"
            value={searchParams.get("category") ?? ""}
            placeholder="Recovery"
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
            label="owner"
            name="owner"
            value={searchParams.get("owner") ?? ""}
            placeholder="Infrastructure"
            onChange={updateFilter}
          />
          <FilterInput
            label="systemId"
            name="systemId"
            value={searchParams.get("systemId") ?? ""}
            placeholder="sys-sharepoint-tenant"
            onChange={updateFilter}
          />
          <FilterSelect
            label="reviewState"
            name="reviewState"
            value={searchParams.get("reviewState") ?? ""}
            options={reviewStateOptions}
            onChange={updateFilter}
          />
          <label style={{ display: "grid", gap: 8, color: "#9eb79b", fontWeight: 600 }}>
            <span>staleOnly</span>
            <label style={checkboxWrapStyle}>
              <input
                type="checkbox"
                checked={searchParams.get("staleOnly") === "true"}
                onChange={(event) => updateStaleOnly(event.target.checked)}
              />
              <span>Only show overdue or changed-after-review records</span>
            </label>
          </label>
          <button
            type="button"
            onClick={clearFilters}
            style={{
              alignSelf: "end",
              height: 44,
              padding: "0 16px",
              borderRadius: 14,
              border: "1px solid rgba(148, 163, 184, 0.35)",
              background: "rgba(10, 17, 11, 0.97)",
              color: "#dff4d3",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Clear filters
          </button>
        </div>

        {response ? (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
            <div style={summaryChipStyle}>{response.total} results</div>
            <div style={summaryChipStyle}>{response.facets.kinds.length} kinds in scope</div>
            <div style={summaryChipStyle}>{response.facets.systems.length} linked systems in scope</div>
          </div>
        ) : null}
      </article>

      {searchQuery.isPending ? (
        <div style={panelStyle}>Loading documentation search inventory...</div>
      ) : searchQuery.isError ? (
        <div style={panelStyle}>Unable to load documentation search inventory right now.</div>
      ) : rows.length === 0 ? (
        <div style={panelStyle}>
          <strong style={{ display: "block", marginBottom: 8 }}>
            No documentation results match the current filters
          </strong>
          <span style={{ color: "#9eb79b", lineHeight: 1.6 }}>
            Try search terms from SOPs, vendors, contacts, infrastructure notes, or recovery procedures
          </span>
        </div>
      ) : (
        <DocumentationSearchResultsTable rows={rows} searchQuery={searchValue} />
      )}
    </section>
  );
}

const filterControlStyle = {
  minWidth: 170,
  borderRadius: 14,
  border: "1px solid rgba(148, 163, 184, 0.42)",
  padding: "10px 12px",
  background: "rgba(10, 17, 11, 0.97)",
};

const checkboxWrapStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  minHeight: 44,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(148, 163, 184, 0.42)",
  background: "rgba(10, 17, 11, 0.97)",
  color: "#9eb79b",
  fontWeight: 500,
};

const summaryChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "10px 14px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#dff4d3",
  fontWeight: 700,
};

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
};
