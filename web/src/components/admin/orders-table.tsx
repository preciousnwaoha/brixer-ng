"use client";

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { adminOrders } from "@/lib/demo-data";

type Row = typeof adminOrders[number];

const columns: ColumnDef<Row>[] = [
  { accessorKey: "reference", header: "Order", cell: ({ row }) => <strong className="text-primary">{row.original.reference}</strong> },
  { accessorKey: "customer", header: "Customer" },
  { accessorKey: "service", header: "Service" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${row.original.status === "Balance due" ? "bg-red-50 text-red-700" : row.original.status === "Received" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{row.original.status}</span> },
  { accessorKey: "payment", header: "Payment" },
  { accessorKey: "assignee", header: "Assigned to" },
  { id: "actions", cell: () => <button className="grid size-8 place-items-center rounded-lg hover:bg-alt-mint" aria-label="Order actions"><MoreHorizontal className="size-4" /></button> }
];

export function OrdersTable({ rows = adminOrders }: { rows?: Row[] }) {
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] text-left text-xs">
        <thead className="border-b border-line text-[9px] font-black uppercase tracking-wider text-muted">{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th className="px-4 py-3" key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead>
        <tbody className="divide-y divide-line">{table.getRowModel().rows.map((row) => <tr key={row.id} className="transition hover:bg-alt-mint/45">{row.getVisibleCells().map((cell) => <td className="px-4 py-4 text-muted" key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
