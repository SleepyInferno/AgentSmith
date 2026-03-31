import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Link } from "react-router-dom";
import type { AssetInventoryRow } from "../../lib/assets";

type DeviceInventoryTableProps = {
  rows: AssetInventoryRow[];
};

const columnHelper = createColumnHelper<AssetInventoryRow>();

function complianceTone(state: string) {
  switch (state) {
    case "compliant":
      return { background: "#dcfce7", color: "#166534" };
    case "noncompliant":
      return { background: "#fecaca", color: "#7f1d1d" };
    case "unknown":
      return { background: "rgba(129, 255, 164, 0.08)", color: "#9eb79b" };
    default:
      return { background: "rgba(129, 255, 164, 0.08)", color: "#9eb79b" };
  }
}

const columns = [
  columnHelper.accessor("deviceName", {
    header: "Device",
    cell: (info) => (
      <Link to={`/devices/${info.row.original.deviceId}`} style={{ color: "#dff4d3", fontWeight: 700 }}>
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("ownerDisplayName", { header: "Owner" }),
  columnHelper.accessor("department", { header: "Department" }),
  columnHelper.accessor("site", { header: "Site" }),
  columnHelper.accessor("operatingSystem", { header: "OS" }),
  columnHelper.accessor("encryptionStatus", { header: "Encryption" }),
  columnHelper.accessor("antivirusStatus", { header: "Antivirus" }),
  columnHelper.accessor("patchStatus", { header: "Patch" }),
  columnHelper.accessor("complianceState", {
    header: "Compliance",
    cell: (info) => {
      const value = info.getValue();
      if (!value) return <>Unknown</>;
      const tone = complianceTone(value);
      return (
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            background: tone.background,
            color: tone.color,
          }}
        >
          {value}
        </span>
      );
    },
  }),
  columnHelper.accessor("lastCheckInAt", {
    header: "Last check-in",
    cell: (info) => formatDateTime(info.getValue()),
  }),
  columnHelper.accessor("riskLevel", { header: "Risk" }),
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

export function DeviceInventoryTable({ rows }: DeviceInventoryTableProps) {
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
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1080 }}>
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
