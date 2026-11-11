import type { Review, VideoReview } from "@/types";

export const siteConfig = {
  name: "Brixer",
  domain: "brixer.ng",
  owner: "Princess Nwaoha",
  company: "The Brand Fixer",
  description: "Nigeria's trusted one-stop business compliance platform.",
  email: "hello@brixer.ng",
  phone: "+234 800 000 0000",
  officeLocation: "Office C3 MIB Plaza, Ground floor, Opposite Oando, Gwarinpa, Nigeria",
  location: "Abuja, Nigeria",
  nav: [
    { label: "Services", href: "/services" },
    { label: "How it works", href: "/#how-it-works" },
    { label: "Banking", href: "/#banking" },
    { label: "Earn", href: "/referrals" },
    //  { label: "Office", href: "/office" }
  ],
  stats: [
    { value: "5,000+", label: "Businesses registered" },
    { value: "4", label: "Partner banks" },
    { value: "3hrs", label: "Fastest turnaround" }
  ],
  ticker: [
    "247 businesses registered this month",
    "LTD registration completed",
    "4 partner banks ready to open your account",
    "18 trademark filings processed this week"
  ],
  banks: ["FCMB", "First Bank", "Zenith Bank", "Keystone Bank"],
  features: {
    activityTicker: true,
    videoReviews: true,
    whatsapp: false,
    aiAssistant: false
  }
} as const;

export const reviews: Review[] = [
  {
    quote: "I registered my business name in under 3 hours. Brixer made me feel like I had a whole compliance team on my side.",
    name: "Adaeze Okonkwo",
    role: "CEO, AdaStyle Lagos",
    initials: "AO"
  },
  {
    quote: "The progress bar is everything. I always knew exactly where my LTD registration was, and my documents came straight to my dashboard.",
    name: "Emmanuel Musa",
    role: "Founder, TechBridge Nigeria",
    initials: "EM"
  },
  {
    quote: "I referred four clients and withdrew ₦12,000 last month. The referral programme has become a useful side income.",
    name: "Fatima Kabiru",
    role: "Business Consultant, Abuja",
    initials: "FK"
  }
];

// Add approved video entries here. The section stays hidden while this list is empty.
export const videoReviews: VideoReview[] = [];

export const faqs = [
  {
    question: "Can I pay before creating an account?",
    answer: "Yes. Choose a service and pay as a guest. After payment, we send a secure link that connects the order to your dashboard account."
  },
  {
    question: "How does the 50% payment option work?",
    answer: "Pay half to begin. When your order reaches the filing stage, the remaining half must be paid before processing continues."
  },
  {
    question: "Where will I receive my completed documents?",
    answer: "Completed documents are placed in your private Brixer document vault and you receive an email when they are ready."
  },
  {
    question: "Is a corporate bank account included?",
    answer: "A corporate bank account opening request is included with any CAC registration. A standalone request is also available for ₦5,000."
  }
];
