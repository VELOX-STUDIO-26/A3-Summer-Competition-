"use client";

const institutions = [
  "Stanford",
  "MIT",
  "Google",
  "Amazon",
  "Microsoft",
  "Coursera",
  "DeepMind",
  "OpenAI",
];

export default function TrustBar() {
  return (
    <section className="py-12 bg-white overflow-hidden border-y border-sand-200">
      <div className="max-w-7xl mx-auto px-6 mb-6">
        <p className="text-center text-sm font-medium text-deep-charcoal/40 tracking-wider">
          Trusted by learners at
        </p>
      </div>
      <div className="relative">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...institutions, ...institutions].map((name, i) => (
            <div
              key={i}
              className="flex items-center justify-center mx-12 transition-all duration-300 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 hover:scale-110"
            >
              <span className="text-2xl font-serif font-bold text-deep-charcoal">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
