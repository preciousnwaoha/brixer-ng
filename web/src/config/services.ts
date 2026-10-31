import type { ServiceDefinition, ServiceFormField } from "@/types";

const identityFields: ServiceFormField[] = [
  { id: "legal_name", label: "Full legal name", type: "text", required: true, placeholder: "As shown on your ID" },
  { id: "phone", label: "Phone number", type: "tel", required: true, placeholder: "+234 801 234 5678" },
  { id: "address", label: "Residential address", type: "textarea", required: true },
  { id: "id_document", label: "Valid identity document", type: "file", required: true, help: "PDF, JPG or PNG, up to 10 MB" }
];

const businessFields: ServiceFormField[] = [
  { id: "preferred_name_1", label: "First proposed name", type: "text", required: true },
  { id: "preferred_name_2", label: "Second proposed name", type: "text", required: true },
  { id: "industry", label: "Nature of business", type: "textarea", required: true, placeholder: "Describe what the business will do" },
  { id: "business_address", label: "Business address", type: "textarea", required: true },
  ...identityFields
];

const make = (service: ServiceDefinition): ServiceDefinition => service;

export const services: ServiceDefinition[] = [
  make({
    code: "BN", slug: "business-name", category: "cac", categoryLabel: "CAC", name: "Business Name Registration", shortName: "Business Name (BN)", icon: "building",
    description: "Register a sole proprietorship or partnership with the Corporate Affairs Commission.",
    longDescription: "Secure your business identity with a guided CAC registration and a clear, trackable process from name reservation to delivered documents.",
    priceKobo: 3_500_000, timeline: "3 hours", available: true, installmentEligible: true,
    included: ["Name availability review", "CAC filing", "Registration certificate", "Free bank account request"],
    referralRewardKobo: 300_000, referralMinimumKobo: 1_200_000, staffRate: 5, formFields: businessFields
  }),
  make({
    code: "LTD", slug: "limited-company", category: "cac", categoryLabel: "CAC", name: "Private Limited Company Registration", shortName: "Private Limited Company (LTD)", icon: "landmark",
    description: "Incorporate a separate legal entity with its core company documents included.",
    longDescription: "Set up a Nigerian limited company with guided shareholder and director information, filing support, and secure document delivery.",
    priceKobo: 6_000_000, timeline: "7 days", available: true, installmentEligible: true,
    included: ["Name reservation", "CAC incorporation", "MEMART", "Share documents", "Free bank account request"],
    referralRewardKobo: 500_000, referralMinimumKobo: 1_500_000, staffRate: 10, formFields: businessFields
  }),
  make({
    code: "NGO-S", slug: "ngo-standard", category: "cac", categoryLabel: "CAC", name: "NGO / Incorporated Trustee — Standard", shortName: "NGO Standard", icon: "users",
    description: "Register a non-profit, association, ministry, or foundation.",
    longDescription: "A guided incorporated-trustee registration for organisations that need formal legal standing in Nigeria.",
    priceKobo: 15_000_000, timeline: "14 days", available: true, installmentEligible: true,
    included: ["Name reservation", "Trustee application", "Required filing support", "Free bank account request"],
    referralRewardKobo: 750_000, referralMinimumKobo: 1_500_000, staffRate: 10, formFields: businessFields
  }),
  make({
    code: "NGO-X", slug: "ngo-executive", category: "cac", categoryLabel: "CAC", name: "NGO / Incorporated Trustee — Executive", shortName: "NGO Executive", icon: "badge-check",
    description: "Expanded incorporated-trustee support for a more hands-on registration.",
    longDescription: "An executive registration package with additional review and concierge handling across the incorporated-trustee process.",
    priceKobo: 20_000_000, timeline: "14 days", available: true, installmentEligible: true,
    included: ["Everything in Standard", "Priority review", "Concierge follow-up", "Free bank account request"],
    referralRewardKobo: 1_000_000, referralMinimumKobo: 2_000_000, staffRate: 10, formFields: businessFields
  }),
  make({
    code: "COOP", slug: "cooperative-society", category: "cac", categoryLabel: "CAC", name: "Cooperative Society Registration", shortName: "Cooperative Society", icon: "handshake",
    description: "Formalise a cooperative for operations, loans, and government recognition.",
    longDescription: "Prepare your cooperative for formal recognition with a clear application checklist and tracked handling.",
    priceKobo: 7_000_000, timeline: "To be confirmed", available: false, installmentEligible: true,
    included: ["Requirements review", "Application preparation", "Registration follow-up"],
    referralRewardKobo: 350_000, referralMinimumKobo: 1_400_000, staffRate: 10, formFields: businessFields
  }),
  make({
    code: "TM", slug: "trademark", category: "ip", categoryLabel: "Intellectual Property", name: "Trademark Registration", shortName: "Trademark", icon: "shield-check",
    description: "Protect your brand name, logo, or identity under Nigerian law.",
    longDescription: "File your brand for trademark protection with guided classification, document collection, and status tracking.",
    priceKobo: 7_500_000, timeline: "To be confirmed", available: true, installmentEligible: true,
    included: ["Brand details review", "Trademark class selection", "Application filing", "Status tracking"],
    referralRewardKobo: 375_000, referralMinimumKobo: 1_125_000, staffRate: 10,
    formFields: [{ id: "brand_name", label: "Brand name", type: "text", required: true }, { id: "brand_description", label: "What does the brand offer?", type: "textarea", required: true }, { id: "brand_logo", label: "Brand logo", type: "file" }, ...identityFields]
  }),
  make({
    code: "TIN", slug: "tin-retrieval", category: "tax", categoryLabel: "Tax & Finance", name: "Tax ID Retrieval", shortName: "TIN Retrieval", icon: "badge-info",
    description: "Retrieve an existing Tax Identification Number from the FIRS system.",
    longDescription: "A fast retrieval service for individuals or businesses that need their existing tax identification details.",
    priceKobo: 500_000, timeline: "24 hours", available: true, installmentEligible: false,
    included: ["Information review", "TIN retrieval", "Secure delivery"],
    referralRewardKobo: 50_000, referralMinimumKobo: 200_000, staffRate: 5, formFields: identityFields
  }),
  make({
    code: "TCC", slug: "tax-clearance", category: "tax", categoryLabel: "Tax & Finance", name: "Tax Clearance Certificate", shortName: "Tax Clearance", icon: "file-check",
    description: "Prepare and follow up a tax-clearance application for eligible businesses.",
    longDescription: "Get organised support for a tax-clearance application required for tenders and major business transactions.",
    priceKobo: 10_000_000, timeline: "To be confirmed", available: true, installmentEligible: true,
    included: ["Requirements review", "Application support", "FIRS follow-up", "Document delivery"],
    referralRewardKobo: 500_000, referralMinimumKobo: 1_500_000, staffRate: 10, formFields: businessFields
  }),
  make({
    code: "SCUML", slug: "scuml", category: "tax", categoryLabel: "Tax & Finance", name: "SCUML Registration", shortName: "SCUML Registration", icon: "lock-keyhole",
    description: "Complete the required anti-money-laundering registration for eligible sectors.",
    longDescription: "Guided document preparation and registration support for businesses subject to SCUML requirements.",
    priceKobo: 4_500_000, timeline: "Varies", available: true, installmentEligible: true,
    included: ["Eligibility review", "Document checklist", "Application filing", "Follow-up"],
    referralRewardKobo: 225_000, referralMinimumKobo: 900_000, staffRate: 10, formFields: businessFields
  }),
  make({
    code: "EXPORT", slug: "export-license", category: "trade", categoryLabel: "Trade", name: "Export Licence", shortName: "Export Licence", icon: "ship",
    description: "Apply for the registration required to export goods from Nigeria.",
    longDescription: "A structured export-licence workflow covering document collection, application preparation, and follow-up.",
    priceKobo: 4_500_000, timeline: "Varies", available: true, installmentEligible: true,
    included: ["Requirements review", "Document checklist", "Application support", "Status tracking"],
    referralRewardKobo: 225_000, referralMinimumKobo: 900_000, staffRate: 10, formFields: businessFields
  }),
  make({
    code: "NIN", slug: "nin-reprint", category: "identity", categoryLabel: "Identity", name: "NIN Reprint", shortName: "NIN Reprint", icon: "contact-round",
    description: "Request a certified reprint of your National Identification Number slip.",
    longDescription: "Securely submit the details required for a NIN slip reprint and receive the result in your vault.",
    priceKobo: 500_000, timeline: "24 hours", available: true, installmentEligible: false,
    included: ["Details review", "Reprint request", "Secure delivery"],
    referralRewardKobo: 50_000, referralMinimumKobo: 200_000, staffRate: 5, formFields: identityFields
  }),
  make({
    code: "BANK", slug: "corporate-bank-account", category: "banking", categoryLabel: "Banking", name: "Corporate Bank Account Opening", shortName: "Corporate Bank Account", icon: "wallet-cards",
    description: "Open an account with one of Brixer's configured partner banks.",
    longDescription: "Choose a partner bank, review its opening requirements, and track the request from submission to delivery.",
    priceKobo: 500_000, timeline: "5–7 days", available: true, installmentEligible: false,
    included: ["Partner-bank selection", "Requirements checklist", "Request routing", "Welcome-pack delivery"],
    referralRewardKobo: 50_000, referralMinimumKobo: 250_000, staffRate: 5,
    formFields: [{ id: "bank", label: "Preferred bank", type: "select", required: true, options: ["FCMB", "First Bank", "Zenith Bank", "Keystone Bank"] }, ...businessFields]
  })
];

export const getService = (slug: string) => services.find((service) => service.slug === slug);
export const enabledServices = services.filter((service) => service.available);
