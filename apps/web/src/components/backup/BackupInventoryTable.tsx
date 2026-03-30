import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Link } from "react-router-dom";
import type { BackupInventoryRow } from "../../lib/backup";

type BackupInventoryTableProps = {
  rows: BackupInventoryRow[];
};

const columnHelper = createColumnHelper<BackupInventoryRow>();

const columns = [
  columnHelper.accessor("systemName", {
    header: "systemName",
    cell: (info) => (
      <Link
        to={`/backup/systems/${info.row.original.systemId}`}
        style={{ color: "#dff4d3", fontWeight: 700, textDecoration: "none" }}
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("category", { header: "category" }),
  columnHelper.accessor("siteName", { header: "siteName" }),
  columnHelper.accessor("coverageState", { header: "coverageState" }),
  columnHelper.accessor("providerKey", { header: "backupProvider" }),
  columnHelper.accessor("lastSuccessfulBackupAt", {
    header: "lastSuccessfulBackupAt",
    cell: (info) => formatDateTime(info.getValue()),
  }),
  columnHelper.accessor("lastRestoreTestAt", {
    header: "lastRestoreTestAt",
    cell: (info) => formatDateTime(info.getValue()),
  }),
  columnHelper.accessor("confidenceState", { header: "confidenceState" }),
  columnHelper.accessor("summary", {
    header: "summary",
    cell: (info) => {
      const tags = buildInventoryTags(info.row.original);

      return (
        <div style={{ display: "grid", gap: 10, minWidth: 320 }}>
          {tags.length > 0 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {tags.map((tag) => (
                <span key={tag} style={{ ...tagStyle, ...toneForTag(tag) }}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          <span style={{ color: "#9eb79b", lineHeight: 1.6 }}>{info.getValue()}</span>
          <Link
            to={`/backup/systems/${info.row.original.systemId}`}
            style={{
              color: "#89ff93",
              fontWeight: 700,
              textDecoration: "none",
              fontSize: 13,
            }}
          >
            Review backup detail
          </Link>
        </div>
      );
    },
  }),
];

function buildInventoryTags(row: BackupInventoryRow) {
  const tags: string[] = [];

  if (row.coverageState === "excluded") {
    tags.push("Excluded by policy");
  }

  if (row.matchingConfidence === "duplicate") {
    tags.push("Duplicate match needs review");
  }

  if (row.sourceHealth && row.sourceHealth.state !== "current" && row.confidenceState === "unknown") {
    tags.push("Telemetry unknown");
  }

  if (row.evidenceSource === "operator_attested") {
    tags.push("Operator-attested proof");
  }

  return tags;
}

function toneForTag(tag: string) {
  if (tag === "Excluded by policy") {
    return { color: "#9eb79b", background: "rgba(129, 255, 164, 0.08)" };
  }

  if (tag === "Duplicate match needs review") {
    return { color: "#fdba74", background: "rgba(234, 88, 12, 0.12)" };
  }

  if (tag === "Telemetry unknown") {
    return { color: "#93c5fd", background: "rgba(59, 130, 246, 0.15)" };
  }

  return { color: "#89ff93", background: "rgba(59, 130, 246, 0.15)" };
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleString();
}

function formatCell(value: string | number | null) {
  if (value === null || value === "") {
    return "Unknown";
  }

  return value;
}

export function BackupInventoryTable({ rows }: BackupInventoryTableProps) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
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
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1320 }}>
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
                <td key={cell.id} style={{ padding: "14px 16px", color: "#dff4d3", verticalAlign: "top" }}>
                  {formatCell(flexRender(cell.column.columnDef.cell, cell.getContext()) as string | number | null)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tagStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};
