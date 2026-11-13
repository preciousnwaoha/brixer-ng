export type UserRole = "client" | "staff" | "admin";

export type ServiceCategory = "cac" | "ip" | "tax" | "trade" | "identity" | "banking";

export type FormFieldType = "text" | "email" | "tel" | "textarea" | "select" | "date" | "file";

export interface ServiceFormField {
  id: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: string[];
  allowedMimeTypes?: string[];
}

export interface ServiceDefinition {
  code: string;
  slug: string;
  category: ServiceCategory;
  categoryLabel: string;
  name: string;
  shortName: string;
  description: string;
  longDescription: string;
  priceKobo: number;
  timeline: string;
  icon: string;
  available: boolean;
  installmentEligible: boolean;
  included: string[];
  referralRewardKobo: number;
  referralMinimumKobo: number;
  staffRate: 5 | 10;
  formFields: ServiceFormField[];
}

export type OrderStage = "received" | "enter_details" | "filing" | "submitted" | "processing" | "completed";
export type PaymentKind = "full" | "deposit" | "balance";
export type PaymentStatus = "initialized" | "pending" | "succeeded" | "failed" | "reversed";

export interface DemoOrder {
  id: string;
  reference: string;
  service: string;
  startedAt: string;
  stage: OrderStage;
  paymentPlan: "full" | "installment";
  totalKobo: number;
  paidKobo: number;
}

export interface Review {
  quote: string;
  name: string;
  role: string;
  initials: string;
}

export interface VideoReview {
  title: string;
  customer: string;
  provider: "youtube" | "vimeo";
  videoId: string;
  posterUrl?: string;
  transcript?: string;
}
