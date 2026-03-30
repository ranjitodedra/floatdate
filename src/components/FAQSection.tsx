"use client";

import { useState } from "react";

const faqItems = [
  {
    question: "I didn’t receive any verification email. What should I do?",
    answer:
      "First, check your spam or junk folder just in case. If you still don’t see it, email support@floatdate.com from your Outlook address and we’ll manually verify your account.",
  },
  {
    question: "Who can sign up?",
    answer:
      "FloatDate is exclusively for University students. You need a valid university email to sign up. We use student emails strictly for verification.",
  },
  {
    question: "Is FloatDate free?",
    answer: "Yes, FloatDate is completely free for all University students.",
  },
  {
    question: "How does the matching algorithm work?",
    answer:
      "You answer 74 research-backed questions across five dimensions: emotional openness, core values, lifestyle, communication style, and interests. Each week, our algorithm finds the person you're most compatible with based on your answers. No manual profile reviews. We use a structured scoring algorithm, not an LLM processing your data.",
  },
  {
    question: "Can this help people make friends too?",
    answer:
      "It’s built for dating, but at its core it’s really about meaningful connections. If a match turns into friendship, that’s still a win. We’re also exploring the idea of a separate friends version, similar to a Bumble BFF style experience, where we’d adjust the questions and compatibility model specifically for platonic connections.",
  },
  {
    question: "How often do I get matched?",
    answer:
      "Once per week. Opt in by Wednesday 9 PM ET and you'll receive your match along with a note explaining why you were paired.",
  },
  {
    question: "Will I ever be matched with the same person twice?",
    answer:
      "No. Our system keeps track of all past matches and ensures you never get the same person again.",
  },
  {
    question: "What information does my match see?",
    answer:
      "Your match receives your name and email so you can connect. Your question answers stay private.",
  },
  {
    question: "What if there's no match for me this week?",
    answer:
      "If no compatible match is found (e.g., not enough people opted in), we'll let you know and you can opt in again next week.",
  },
  {
    question: "Can I change my answers after signing up?",
    answer:
      "The 74 questions are completed once during setup. We may add the ability to update answers in the future.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="bg-zinc-50 px-6 py-20">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center text-3xl font-bold text-zinc-900 mb-12">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between focus:outline-none"
                aria-expanded={openIndex === index}
              >
                <span className="text-lg font-semibold text-zinc-900 pr-4">
                  {item.question}
                </span>
                <span
                  className={`text-zinc-500 text-2xl font-light transition-transform duration-200 flex-shrink-0 ${openIndex === index ? "rotate-180" : ""
                    }`}
                >
                  ▼
                </span>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5 pt-0">
                  <p className="text-zinc-600 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
