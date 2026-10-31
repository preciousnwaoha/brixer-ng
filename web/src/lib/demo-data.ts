import type { DemoOrder } from "@/types";

export const clientOrders: DemoOrder[] = [
  { id: "1", reference: "BRX-0892", service: "LTD Registration", startedAt: "Jun 5, 2026", stage: "filing", paymentPlan: "installment", totalKobo: 6_000_000, paidKobo: 3_000_000 },
  { id: "2", reference: "BRX-0885", service: "Trademark Registration", startedAt: "Jun 1, 2026", stage: "processing", paymentPlan: "full", totalKobo: 7_500_000, paidKobo: 7_500_000 },
  { id: "3", reference: "BRX-0871", service: "Business Name Registration", startedAt: "May 15, 2026", stage: "completed", paymentPlan: "full", totalKobo: 3_500_000, paidKobo: 3_500_000 }
];

export const availableJobs = [
  { id: "BRX-0901", service: "Business Name Registration", client: "Ngozi Eze", detail: "Full payment · Documents submitted", earning: 175_000, category: "CAC" },
  { id: "BRX-0900", service: "LTD Registration", client: "Babatunde Ola", detail: "Full payment · MEMART details submitted", earning: 600_000, category: "CAC" },
  { id: "BRX-0898", service: "Trademark Registration", client: "Amara Brands Ltd", detail: "Full payment · Logo uploaded", earning: 750_000, category: "IP" }
];

export const adminOrders = [
  { reference: "BRX-0901", customer: "Ngozi Eze", service: "Business Name", status: "Received", payment: "Paid", assignee: "Unassigned" },
  { reference: "BRX-0900", customer: "Babatunde Ola", service: "LTD Registration", status: "Filing", payment: "Paid", assignee: "Tolu F." },
  { reference: "BRX-0899", customer: "Kemi Adeyemi", service: "Tax Clearance", status: "Balance due", payment: "50%", assignee: "Amaka O." },
  { reference: "BRX-0898", customer: "Amara Brands", service: "Trademark", status: "Processing", payment: "Paid", assignee: "Tolu F." }
];
