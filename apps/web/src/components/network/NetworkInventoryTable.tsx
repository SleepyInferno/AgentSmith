import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Link } from "react-router-dom";
import type { NetworkInventoryRow } from "../../lib/network";

type NetworkInventoryTableProps = {
  rows: NetworkInventoryRow[];
};

const columnHelper = createColumnHelper<NetworkInventoryRow>();

const columns = [
  columnHelper.accessor("resourceName", {
    header: "Resource",
    cell: (info) => (
      <Link
        to={`/network/resources/${info.row.original.resourceId}`}
        style={{ color: "#0f172a", fontWeight: 700, textDecoration: "none" }}
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("resourceKind", { header: "Kind" }),
  columnHelper.accessor("siteName", { header: "Site" }),
  columnHelper.accessor("operationalStatus", { header: "Status" }),
  columnHelper.accessor("freshnessState", { header: "Freshness" }),
  columnHelper.accessor("lastSeenAt", {
    header: "Last seen",
    cell: (info) => formatDateTime(info.getValue()),
  }),
  columnHelper.accessor("summary", {
    header: "Summary",
    cell: (info) => (
      <div style={{ display: "grid", gap: 10, minWidth: 260 }}>
        <span style={{ color: "#334155", lineHeight: 1.6 }}>{info.getValue()}</span>
        <Link
          to={`/network/resources/${info.row.original.resourceId}`}
          style={{
            color: "#0369a1",
            fontWeight: 700,
            textDecoration: "none",
            fontSize: 13,
          }}
        >
          Review detail
        </Link>
      </div>
    ),
  }),
];

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

export function NetworkInventoryTable({ rows }: NetworkInventoryTableProps) {
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
        background: "#ffffff",
      }}
    >
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1120 }}>
        <thead style={{ background: "#e2e8f0" }}>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    color: "#334155",
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
                <td key={cell.id} style={{ padding: "14px 16px", color: "#0f172a", verticalAlign: "top" }}>
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
