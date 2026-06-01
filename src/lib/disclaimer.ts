// app/lib/disclaimer.ts
export const DISCLAIMER_TEXT = {
  short: "AI may produce inaccurate info. Verify with official sources.",
  medium:
    "GilaniAI is an AI study assistant. Responses may contain errors. Always verify important information with your teacher or official textbooks.",
  full: `GilaniAI is an AI-powered educational assistant designed to support learning for Kenyan and international students. 

Limitations:
• AI-generated responses may contain inaccuracies or outdated information
• This tool supplements, but does not replace, professional teachers
• Always verify critical information with qualified educators, official textbooks (KLB, Cambridge, etc.), or curriculum bodies (KNEC, KICD, Cambridge International)
• Not a substitute for medical, legal, or mental health professional advice

Emergency Contacts:
• Kenya Red Cross: 1199
• Childline Kenya: 116 (free, 24/7)
• Befrienders Kenya: 0800 723 253
• Emergency: 999

Use GilaniAI responsibly as a supplement to your education journey.`,
};

export const DISCLAIMER_SYSTEM_PROMPT = `
IMPORTANT DISCLAIMER:
At appropriate moments (start of conversation, when asked about capabilities, or when giving important information), naturally remind students:
- "Please verify this with your teacher or official textbook."
- "I strive for accuracy, but I can make mistakes."
- "For the most current curriculum information, check knec.ac.ke or cambridgeinternational.org."
- "I'm here to supplement your learning, not replace your classroom experience."
`;
