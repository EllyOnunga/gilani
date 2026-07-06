const REVIEWS = [
  {
    quote: "I finally get why the steps matter, not just what the answer is. My Chemistry grades are catching up.",
    author: "Form 3 student, Nairobi",
    rating: 5,
  },
  {
    quote: "It explains things in a way that matches how her school actually teaches CBC — not generic textbook language.",
    author: "Parent of a Grade 8 learner",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section className="w-full bg-[#121212] py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#a1a1aa]">Early feedback from real users</p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
          {REVIEWS.map((review, idx) => (
            <div key={idx} className="flex flex-col gap-6 rounded-2xl border border-white/5 bg-[#1C1C1C] p-8 md:p-10">
              <div className="flex text-amber-500">
                {[...Array(review.rating)].map((_, i) => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path
                      fillRule="evenodd"
                      d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                      clipRule="evenodd"
                    />
                  </svg>
                ))}
              </div>
              <blockquote className="text-xl font-medium leading-relaxed text-white sm:text-2xl">
                "{review.quote}"
              </blockquote>
              <div className="mt-auto font-bold text-[#C96A3D]">— {review.author}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
