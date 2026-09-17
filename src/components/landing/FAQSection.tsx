"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { faqs } from "@/components/landing/mock-data";

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="bg-[#020816] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.84fr_1.16fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/65">FAQ</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">Tez-tez verilən suallar</h2>
          <p className="mt-4 max-w-xl text-base leading-8 text-slate-300">
            Əsas məhsul suallarını eyni premium ritmdə açılan accordion səthi ilə təqdim edirik.
          </p>
        </div>

        <div className="grid gap-4">
          {faqs.map((item, index) => {
            const open = openIndex === index;
            return (
              <article
                key={item.question}
                className={`rounded-[1.6rem] border p-5 transition ${
                  open ? "border-cyan-300/28 bg-cyan-300/8" : "border-white/10 bg-white/6"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <span className="text-lg font-medium text-white">{item.question}</span>
                  <span className="rounded-full border border-white/10 p-2 text-slate-300">
                    {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </span>
                </button>
                {open ? <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{item.answer}</p> : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
