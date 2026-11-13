import type { Review, VideoReview } from "@/types";

export const siteConfig = {
  name: "Brixer",
  domain: "brixer.ng",
  owner: "Princess Nwaoha",
  company: "The Brand Fixer",
  description: "Nigeria's trusted one-stop business compliance platform.",
  email: "support@brixer.ng",
  phone: "+234 907 471 1814",
  whatsapp: "+234 907 471 1814",
  officeLocation: "Office C3 MIB Plaza, Ground floor, Opposite Oando, Gwarinpa, Nigeria",
  location: "Abuja, Nigeria",
  nav: [
    { label: "Services", href: "/services" },
    { label: "How it works", href: "/#how-it-works" },
    { label: "Bank Account", href: "/#banking" },
    { label: "Our Office", href: "/#office" },
    { label: "Reviews", href: "/#reviews" },
    { label: "Contact", href: "/#contact" }
  ],
  stats: [
    { value: "500+", label: "Businesses registered" },
    { value: "4", label: "Partner banks" },
    { value: "3hrs", label: "Fastest turnaround" }
  ],
  ticker: [
    "24/7 businesses registered this month",
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
    answer: "Yes. Choose a service and pay as a guest. Log in with your checkout email afterward to complete your service details and follow progress."
  },
  {
    question: "How does the 50% payment option work?",
    answer: "Eligible services priced at ₦10,000 or more can start with half payment. Other items are paid in full. Settle each item’s balance before downloading its completed documents."
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




/* Implementation reference supplied by the owner.
Instead of: Received, Filing, Submitted, Processing, Completed. It would be: Received, Enter details, Filing, Submitted, Processing, Completed.

When the user needs to fill in details for the order item, the top right corner of the card would have a badge "Pending details" and the user would see a button to enter the required details. And the card button will be "Enter Needed Details". Once the user submits the form, the current status is updated to "Filing".
If the the admin had an issue with the filing (Filing, Submitted, Processing,) then the admin can flag the order item as "Issue" in the current status, To do this the admin will add a message for the client, and choose the filled types that should the user should enter. So the amdin can chose text, phone, email, file upload (can restrict the file types - default all supported), date, select (with options), all with labels. When the issue has been sent, the user's end sees The current status in a red state. the order/service item card has an issue badge at the top right corner, and there's a resolve issue button that takes then user to the form to enter required details. Once the user submits the form, the tag at the top right corner changes to resolved, "settling issue", and the current status is updated to "Filing"/"Submitted"/"Processing" again. The admin can then continue with the order item, switch back to the no issue state so the user see the top right corner of the item card as no issue.

When user clicks "New order", the services selection screen should be in dashbaord (no hero, just the list of services with the filters). Is should not taking the user to the main service page yet. If the user selects a service, the cart icon shows in the dashboard header, and the floating "Continue x items" button shows at the bottom right as usual. When user continues the flow remains the same it goes to the cart page, and continues from the as usual. Since the user's details are in the db, the checkout form should be prefilled with the user's details (they can edit it since they could be ordering for someone else). Not this flow means that when there are items in cart, the user can see the cart icon from the dashboard header, and the floating "Continue x items" button at the bottom right in dashboard. The user can click either to go to the cart page and continue the flow as usual.


The "Send transactional updates to this WhatsApp number when available." should be "I will receive my order updates on this WhatsApp number." and checked by default.
*/
