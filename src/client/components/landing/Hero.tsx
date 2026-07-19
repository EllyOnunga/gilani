import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

const CURRICULA = {
  KCSE: {
    label: "KCSE",
    full: "Kenya Certificate of Secondary Education",
    chat: [
      { type: "student", text: "Explain photosynthesis simply for my KCSE Biology paper." },
      {
        type: "ai",
        text: "Think of a leaf as a tiny solar-powered kitchen. Chlorophyll traps sunlight, mixes it with water from the roots and CO2 from the air, and bakes glucose for energy — releasing oxygen as a by-product. That's your Form 2 Biology answer, in one bite.",
      },
    ],
  },
  CBC: {
    label: "CBC",
    full: "Competency-Based Curriculum",
    chat: [
      { type: "student", text: "How do I show 'critical thinking' in my CBC science project?" },
      {
        type: "ai",
        text: "CBC rewards how you think, not just what you know. State your hypothesis, show your working step-by-step, then reflect: what would you test differently next time? That reflection line often carries the most marks.",
      },
    ],
  },
  IGCSE: {
    label: "IGCSE",
    full: "Cambridge IGCSE",
    chat: [
      {
        type: "student",
        text: "What's the difference between mitosis and meiosis for IGCSE Biology?",
      },
      {
        type: "ai",
        text: "Mitosis makes two identical cells for growth and repair. Meiosis makes four genetically different cells for reproduction, halving the chromosome number. Examiners love it when you mention 'genetic variation' — that's the key marking-point phrase.",
      },
    ],
  },
  University: {
    label: "University",
    full: "Higher Education / University",
    chat: [
      {
        type: "student",
        text: "Explain the CAP theorem in distributed systems for my CS exam.",
      },
      {
        type: "ai",
        text: "CAP says a distributed system can only guarantee two of three properties at once: Consistency (every read gets the latest write), Availability (every request gets a response), or Partition tolerance (the system keeps running despite network splits). In practice, partition tolerance is non-negotiable — so you're always trading consistency for availability, or vice versa.",
      },
    ],
  },
} as const;

type CurriculumKey = keyof typeof CURRICULA;
const CURRICULUM_ORDER: CurriculumKey[] = ["KCSE", "CBC", "IGCSE", "University"];
const AUTO_ROTATE_MS = 7000;
const INTERACTION_PAUSE_MS = 16000;

export default function Hero() {
  const [curriculum, setCurriculum] = useState<CurriculumKey>("KCSE");
  const [messages, setMessages] = useState<{ type: string; text: string }[]>([]);
  const [typingText, setTypingText] = useState("");
  const [step, setStep] = useState(0);
  const lastInteractionRef = useRef(0);

  // Replay the chat sequence whenever the active curriculum changes
  useEffect(() => {
    setMessages([]);
    setTypingText("");
    setStep(0);
  }, [curriculum]);

  useEffect(() => {
    const seq = CURRICULA[curriculum].chat;
    let timeout: ReturnType<typeof setTimeout>;
    if (step === 0) {
      timeout = setTimeout(() => setStep(1), 500);
    } else if (step === 1) {
      setMessages([{ type: "student", text: seq[0].text }]);
      timeout = setTimeout(() => setStep(2), 800);
    } else if (step === 2) {
      const targetText = seq[1].text;
      let currentLength = 0;
      const typeChar = () => {
        if (currentLength < targetText.length) {
          currentLength++;
          setTypingText(targetText.slice(0, currentLength));
          timeout = setTimeout(typeChar, 18);
        } else {
          setMessages((prev) => [...prev, { type: "ai", text: targetText }]);
          setTypingText("");
          setStep(3);
        }
      };
      typeChar();
    }
    return () => clearTimeout(timeout);
  }, [step, curriculum]);

  // Gentle auto-rotation through curricula, paused for a while after manual interaction
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastInteractionRef.current < INTERACTION_PAUSE_MS) return;
      setCurriculum((prev) => {
        const idx = CURRICULUM_ORDER.indexOf(prev);
        return CURRICULUM_ORDER[(idx + 1) % CURRICULUM_ORDER.length];
      });
    }, AUTO_ROTATE_MS);
    return () => clearInterval(interval);
  }, []);

  const selectCurriculum = (key: CurriculumKey) => {
    lastInteractionRef.current = Date.now();
    setCurriculum(key);
  };

  return (
    <section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#161210] pt-[88px] pb-20">
      {/* Rich Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#C96A3D]/20 blur-[120px] rounded-full mix-blend-screen opacity-60 motion-safe:animate-pulse [animation-duration:8s]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#C96A3D]/10 blur-[150px] rounded-full mix-blend-screen opacity-50"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50"></div>
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 lg:flex-row lg:items-center">
        {/* Left Side: Copy & CTA */}
        <div className="flex flex-1 min-w-0 flex-col items-start gap-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C96A3D]/30 bg-[#C96A3D]/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#E28743] backdrop-blur-sm shadow-[0_0_15px_rgba(201,106,61,0.2)]">
            <span className="relative flex h-2 w-2">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C96A3D] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C96A3D]"></span>
            </span>
            GilaniAI is Live
          </div>

          {/* Curriculum switcher */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {CURRICULUM_ORDER.map((key) => (
                <button
                  key={key}
                  onClick={() => selectCurriculum(key)}
                  className={`rounded-full px-4 py-1.5 text-sm font-bold tracking-wide transition-all duration-300 ${
                    curriculum === key
                      ? "bg-[#C96A3D] text-white shadow-[0_0_20px_rgba(201,106,61,0.4)]"
                      : "border border-white/10 bg-white/5 text-[#a1a1aa] hover:border-white/20 hover:text-white"
                  }`}
                >
                  {CURRICULA[key].label}
                </button>
              ))}
            </div>
            <p
              key={curriculum + "-full"}
              className="text-xs text-[#a1a1aa]/70 font-mono animate-in fade-in duration-300"
            >
              {CURRICULA[curriculum].full}
            </p>
          </div>

          <h1 className="font-serif text-5xl font-bold tracking-tight text-white sm:text-6xl xl:text-7xl leading-[1.1] break-words w-full">
            Ace your{" "}
            <span
              key={curriculum}
              className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#C96A3D] to-[#E28743] animate-in fade-in slide-in-from-bottom-2 duration-500"
            >
              {CURRICULA[curriculum].label}
            </span>
            , <br className="hidden lg:block" />
            one question at a time.
          </h1>

          <p className="max-w-xl text-lg text-[#a1a1aa] sm:text-xl leading-relaxed font-light">
            GilaniAI doesn't just hand you answers — it teaches you how to find them,{" "}
            <span className="text-white font-semibold">the way a real tutor would.</span>
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-2">
            <Link
              to="/login"
              search={{ redirect: undefined, signout: undefined }}
              className="group relative rounded-full bg-[#C96A3D] px-8 py-4 text-base font-bold text-white transition-all hover:bg-[#E28743] hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(201,106,61,0.4)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              <span className="relative">Start for Free</span>
            </Link>
            <a
              href="#demo"
              className="rounded-full border border-white/10 bg-white/5 px-8 py-4 text-base font-medium text-white transition-all hover:bg-white/10 hover:border-white/20 backdrop-blur-md"
            >
              Watch Demo
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6 text-sm text-[#a1a1aa]">
            <span className="inline-flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="w-4 h-4 text-[#E28743]"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              Free to start, no credit card required
            </span>
            <span className="text-white/20">·</span>
            <span>Real teacher escalation built in</span>
          </div>
        </div>

        {/* Right Side: Mockup & Live Chat */}
        <div className="relative flex flex-1 items-center justify-center w-full max-w-lg lg:max-w-none">
          {/* Floating Glow Chips */}
          <div className="absolute -left-10 top-20 hidden motion-safe:animate-bounce rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-5 py-3 text-sm font-semibold text-white shadow-2xl md:block [animation-duration:4s] z-20">
            <span className="mr-2 text-xl" aria-hidden="true">
              📄
            </span>{" "}
            Upload PDF
          </div>
          <div className="absolute -right-6 top-40 hidden motion-safe:animate-bounce rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-5 py-3 text-sm font-semibold text-white shadow-2xl md:block [animation-duration:5s] [animation-delay:1s] z-20">
            <span className="mr-2 text-xl" aria-hidden="true">
              🧮
            </span>{" "}
            Math Solver
          </div>
          <div className="absolute -left-12 bottom-40 hidden motion-safe:animate-bounce rounded-2xl border border-[#C96A3D]/30 bg-[#C96A3D]/10 backdrop-blur-xl px-5 py-3 text-sm font-semibold text-[#E28743] shadow-[0_0_20px_rgba(201,106,61,0.3)] md:block [animation-duration:4.5s] [animation-delay:0.5s] z-20">
            <span className="mr-2 text-xl" aria-hidden="true">
              🤖
            </span>{" "}
            AI Tutor
          </div>

          {/* Phone Frame */}
          <div className="relative w-full max-w-[260px] sm:max-w-[300px] md:max-w-[380px] h-[464px] sm:h-[549px] md:h-[676px] rounded-[48px] border-[10px] border-[#18181b] bg-[#161210] shadow-[0_20px_60px_-15px_rgba(201,106,61,0.5)] overflow-hidden transform hover:-translate-y-2 hover:rotate-1 transition-transform duration-700 ease-out z-10">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30"></div>

            <div className="h-10 w-full flex justify-between px-6 pt-3 items-center bg-transparent absolute top-0 z-20">
              <span className="text-[11px] font-bold text-white">9:41</span>
              <div className="flex gap-1.5 items-center">
                <div className="w-4 h-3 rounded-sm border border-white flex justify-end p-[1px]">
                  <div className="w-2.5 h-full bg-white rounded-[1px]"></div>
                </div>
              </div>
            </div>

            <div className="flex flex-col h-full pt-16 p-4 gap-4 overflow-y-auto bg-gradient-to-b from-[#211B18] to-[#161210]">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex w-full ${msg.type === "student" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[20px] px-4 py-3 text-[13px] leading-relaxed shadow-md ${
                      msg.type === "student"
                        ? "bg-[#C96A3D] text-white rounded-tr-sm"
                        : "bg-[#27272a] border border-white/5 text-[#f4f4f5] rounded-tl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {typingText && (
                <div className="flex w-full justify-start">
                  <div className="max-w-[85%] rounded-[20px] bg-[#27272a] border border-white/5 px-4 py-3 text-[13px] leading-relaxed text-[#f4f4f5] rounded-tl-sm">
                    {typingText}
                    <span className="inline-block w-1.5 h-3 ml-1 bg-[#C96A3D] motion-safe:animate-pulse"></span>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-[#161210] via-[#161210] to-transparent pt-12 z-20">
              <div className="w-full rounded-full border border-white/10 bg-[#27272a]/80 backdrop-blur-md px-4 py-3 flex items-center justify-between shadow-lg">
                <span className="text-[13px] text-white/40">Message GilaniAI...</span>
                <div className="w-7 h-7 rounded-full bg-[#C96A3D] flex items-center justify-center shadow-lg shadow-[#C96A3D]/50">
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
