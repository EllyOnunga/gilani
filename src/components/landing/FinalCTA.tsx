import { Link } from "@tanstack/react-router";

export default function FinalCTA() {
    return (
        <section className="w-full bg-[#C96A3D] py-24">
            <div className="mx-auto flex max-w-4xl flex-col items-center justify-center px-6 text-center">
                <h2 className="mb-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                    Ready to Learn Smarter?
                </h2>
                <p className="mb-10 text-lg font-medium text-white/90 sm:text-xl">
                    Join thousands of students using GilaniAI.
                </p>
                <Link 
                    to="/"
                    search={{ authModalOpen: true }}
                    className="rounded-full bg-white px-10 py-5 text-lg font-bold text-[#C96A3D] shadow-2xl transition-transform hover:scale-105 active:scale-95"
                >
                    Join Free
                </Link>
            </div>
        </section>
    );
}
