"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { faqs } from "@/config/site";
import { SectionHeading } from "@/components/ui/section-heading";

export function FaqSection() {
  const [open, setOpen] = useState(0);
  return (
    <section className="bg-[#fbfcfb] py-16 sm:py-16">
      <div className="shell grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
        <SectionHeading
          eyebrow="Frequently asked Questions"
          title="Clear before you commit."
          copy="If you need something more specific, our team can help you choose the right service."
        />
        <div className="grid gap-3">
          {faqs.map((faq, index) => (
            <div
              key={faq.question}
              className="rounded-2xl border border-line bg-white"
            >
              <button
                className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-extrabold text-primary sm:p-6 sm:text-base"
                aria-expanded={open === index}
                onClick={() => setOpen(open === index ? -1 : index)}
              >
                {faq.question}
                <ChevronDown
                  className={`size-4 shrink-0 transition ${open === index ? "rotate-180" : ""}`}
                />
              </button>
              {open === index && (
                <p className="px-5 pb-5 text-sm leading-7 text-muted sm:px-6 sm:pb-6">
                  {faq.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
