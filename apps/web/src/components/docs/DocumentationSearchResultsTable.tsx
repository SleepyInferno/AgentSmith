import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Link } from "react-router-dom";
import type { DocumentationSearchRow } from "../../lib/docs";

type DocumentationSearchResultsTableProps = {
  rows: DocumentationSearchRow[];
  searchQuery: string;
};

const columnHelper = createColumnHelper<DocumentationSearchRow>();

const columns = [
  columnHelper.accessor("title", {
    header: "Title",
    cell: (info) => {
      const row = info.row.original;
      const focusReason = row.reasons[0] ?? null;
      const tableMeta = info.table.options.meta as { searchQuery?: string } | undefined;

      return (
        <div style={{ display: "grid", gap: 10, minWidth: 260 }}>
          <Link
            to={`/docs/${row.documentId}`}
            state={{
              from: "docs-search",
              focusReason,
              searchQuery: tableMeta?.searchQuery ?? "",
            }}
            style={{ color: "#dff4d3", fontWeight: 700, textDecoration: "none" }}
          >
            {info.getValue()}
          </Link>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {row.reasons.map((reason) => (
              <span key={`${row.documentId}-${reason.code}`} style={reasonChipStyle}>
                {reason.label}
              </span>
            ))}
          </div>
        </div>
      );
    },
  }),
  columnHelper.accessor("kind", {
    header: "Kind",
    cell: (info) => info.getValue().replace(/_/g, " "),
  }),
  columnHelper.accessor("reviewState", { header: "Review state" }),
  columnHelper.accessor("reviewDueAt", {
    header: "Review due",
    cell: (info) => formatDateTime(info.getValue()),
  }),
  columnHelper.accessor("owner", {
    header: "Owner",
    cell: (info) => info.getValue() ?? "Unknown",
  }),
  columnHelper.accessor("site", {
    header: "Site",
    cell: (info) => info.getValue() ?? "Unknown",
  }),
  columnHelper.accessor("category", {
    header: "Category",
    cell: (info) => info.getValue() ?? "Unknown",
  }),
  columnHelper.accessor("matchedExcerpt", {
    header: "matchedExcerpt",
    cell: (info) => (
      <div style={{ display: "grid", gap: 8, minWidth: 300 }}>
        <span style={{ color: "#9eb79b", lineHeight: 1.6 }}>
          {info.getValue() ?? info.row.original.summary ?? "No matched excerpt"}
        </span>
        <span style={{ color: "#89ff93", fontSize: 13, fontWeight: 700 }}>
          {info.row.original.linkedSystems.length > 0
            ? `${info.row.original.linkedSystems.length} linked systems`
            : "No linked systems"}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor("relevanceScore", {
    header: "relevanceScore",
    cell: (info) => info.getValue().toFixed(2),
  }),
];

function formatDateTime(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleString();
}

export function DocumentationSearchResultsTable({
  rows,
  searchQuery,
}: DocumentationSearchResultsTableProps) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      searchQuery,
    },
  });

  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: 24,
        border: "1px solid rgba(148, 163, 184, 0.22)",
        background: "rgba(10, 17, 11, 0.97)",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1360 }}>
        <thead style={{ background: "rgba(129, 255, 164, 0.08)" }}>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    color: "#9eb79b",
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} style={{ borderTop: "1px solid rgba(226, 232, 240, 0.9)" }}>
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  style={{
                    padding: "14px 16px",
                    color: "#dff4d3",
                    verticalAlign: "top",
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const reasonChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(10, 17, 11, 0.97)",
  color: "#93c5fd",
  fontSize: 12,
  fontWeight: 700,
};
