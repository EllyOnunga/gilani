export default function SocialProof() {
    return (
        <section className="w-full border-y border-white/5 bg-[#1C1C1C]/30 py-12">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-6 px-6 text-center">
                <p className="text-sm font-medium uppercase tracking-widest text-[rgba(255,255,255,0.5)]">
                    Trusted by students preparing for
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 text-lg font-bold text-[rgba(255,255,255,0.9)] sm:text-2xl">
                    <span>KCSE</span>
                    <span className="text-white/20">•</span>
                    <span>University</span>
                    <span className="text-white/20">•</span>
                    <span>College</span>
                    <span className="text-white/20">•</span>
                    <span>Professional Exams</span>
                </div>
            </div>
        </section>
    );
}
