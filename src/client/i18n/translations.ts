// ─── Translation Dictionaries ─────────────────────────────────────────────────
// Add keys here for every string you want to translate.
// Swahili (sw) is the second supported language.

export type LangCode = "en" | "sw";

// All keys that must be present in every language dictionary
export type TranslationKey =
  | "nav_home"
  | "nav_chats"
  | "nav_notes"
  | "nav_quizzes"
  | "nav_planner"
  | "nav_saved"
  | "nav_settings"
  | "nav_upgrade"
  | "nav_sign_out"
  | "nav_new_chat"
  | "nav_all_chats"
  | "tab_profile"
  | "tab_tutor"
  | "tab_theme"
  | "tab_plan"
  | "tab_consent"
  | "tab_notifications"
  | "tab_language"
  | "tab_accessibility"
  | "tab_shortcuts"
  | "tab_settings"
  | "action_save"
  | "action_cancel"
  | "action_back"
  | "action_close"
  | "action_delete"
  | "action_confirm"
  | "action_send"
  | "action_loading"
  | "action_saving"
  | "tutor_greeting_1"
  | "tutor_greeting_2"
  | "tutor_greeting_3"
  | "tutor_greeting_4"
  | "tutor_input_placeholder"
  | "tutor_recent_chats"
  | "tutor_no_messages"
  | "tutor_start_hint"
  | "tutor_empty_math"
  | "tutor_empty_science"
  | "tutor_empty_history"
  | "tutor_empty_english"
  | "tutor_empty_kiswahili"
  | "tutor_empty_chemistry"
  | "error_generic"
  | "error_rate_limit"
  | "error_daily_limit"
  | "status_thinking"
  | "sidebar_search"
  | "sidebar_today"
  | "sidebar_yesterday"
  | "sidebar_this_week"
  | "sidebar_older";

type Dict = Record<TranslationKey, string>;

// ─── English ──────────────────────────────────────────────────────────────────
const en: Dict = {
  // Navigation
  nav_home: "Home",
  nav_chats: "Chats",
  nav_notes: "Notes",
  nav_quizzes: "Quizzes",
  nav_planner: "Planner",
  nav_saved: "Saved",
  nav_settings: "Settings",
  nav_upgrade: "Upgrade",
  nav_sign_out: "Sign out",
  nav_new_chat: "New Chat",
  nav_all_chats: "All Chats",

  // Settings drawer tabs
  tab_profile: "Profile",
  tab_tutor: "Tutor",
  tab_theme: "Theme",
  tab_plan: "Plan & Usage",
  tab_consent: "Consent",
  tab_notifications: "Notifications",
  tab_language: "Language",
  tab_accessibility: "Accessibility",
  tab_shortcuts: "Shortcuts",
  tab_settings: "Settings",

  // Common actions
  action_save: "Save",
  action_cancel: "Cancel",
  action_back: "Back",
  action_close: "Close",
  action_delete: "Delete",
  action_confirm: "Confirm",
  action_send: "Send",
  action_loading: "Loading…",
  action_saving: "Saving…",

  // Tutor / Chat interface
  tutor_greeting_1: "Hello{name}! Ready to study?",
  tutor_greeting_2: "Welcome back{name}! Let's keep learning.",
  tutor_greeting_3: "Good to see you{name}! What are we tackling today?",
  tutor_greeting_4: "Hey there{name}! Your tutor is ready.",
  tutor_input_placeholder: "Ask anything about your studies…",
  tutor_recent_chats: "Recent Chats",
  tutor_no_messages: "No messages yet",
  tutor_start_hint: "Start a conversation below",
  tutor_empty_math: "Math",
  tutor_empty_science: "Science",
  tutor_empty_history: "History",
  tutor_empty_english: "English",
  tutor_empty_kiswahili: "Kiswahili",
  tutor_empty_chemistry: "Chemistry",

  // Errors / status
  error_generic: "Something went wrong. Please try again.",
  error_rate_limit: "Too many messages — please wait a moment",
  error_daily_limit: "Daily limit reached — resets at midnight",
  status_thinking: "Thinking…",

  // Sidebar / Shell
  sidebar_search: "Search chats…",
  sidebar_today: "Today",
  sidebar_yesterday: "Yesterday",
  sidebar_this_week: "This week",
  sidebar_older: "Older",
};

// ─── Swahili ──────────────────────────────────────────────────────────────────
const sw: Dict = {
  // Navigation
  nav_home: "Nyumbani",
  nav_chats: "Mazungumzo",
  nav_notes: "Maelezo",
  nav_quizzes: "Mazoezi",
  nav_planner: "Mpango",
  nav_saved: "Zilizohifadhiwa",
  nav_settings: "Mipangilio",
  nav_upgrade: "Boresha",
  nav_sign_out: "Toka",
  nav_new_chat: "Mazungumzo Mapya",
  nav_all_chats: "Mazungumzo Yote",

  // Settings drawer tabs
  tab_profile: "Wasifu",
  tab_tutor: "Mwalimu",
  tab_theme: "Mandhari",
  tab_plan: "Mpango & Matumizi",
  tab_consent: "Idhini",
  tab_notifications: "Arifa",
  tab_language: "Lugha",
  tab_accessibility: "Upatikanaji",
  tab_shortcuts: "Njia za Mkato",
  tab_settings: "Mipangilio",

  // Common actions
  action_save: "Hifadhi",
  action_cancel: "Ghairi",
  action_back: "Rudi",
  action_close: "Funga",
  action_delete: "Futa",
  action_confirm: "Thibitisha",
  action_send: "Tuma",
  action_loading: "Inapakia…",
  action_saving: "Inahifadhi…",

  // Tutor / Chat interface
  tutor_greeting_1: "Habari{name}! Uko tayari kusoma?",
  tutor_greeting_2: "Karibu tena{name}! Tuendelee kujifunza.",
  tutor_greeting_3: "Furaha kukuona{name}! Tunashughulikia nini leo?",
  tutor_greeting_4: "Hujambo{name}! Mwalimu wako yuko tayari.",
  tutor_input_placeholder: "Uliza chochote kuhusu masomo yako…",
  tutor_recent_chats: "Mazungumzo ya Hivi Karibuni",
  tutor_no_messages: "Bado hakuna ujumbe",
  tutor_start_hint: "Anza mazungumzo hapa chini",
  tutor_empty_math: "Hisabati",
  tutor_empty_science: "Sayansi",
  tutor_empty_history: "Historia",
  tutor_empty_english: "Kiingereza",
  tutor_empty_kiswahili: "Kiswahili",
  tutor_empty_chemistry: "Kemia",

  // Errors / status
  error_generic: "Hitilafu fulani imetokea. Tafadhali jaribu tena.",
  error_rate_limit: "Ujumbe mwingi — tafadhali subiri kidogo",
  error_daily_limit: "Kiwango cha kila siku kimefikiwa — kinafunguka usiku wa manane",
  status_thinking: "Inafikiri…",

  // Sidebar / Shell
  sidebar_search: "Tafuta mazungumzo…",
  sidebar_today: "Leo",
  sidebar_yesterday: "Jana",
  sidebar_this_week: "Wiki hii",
  sidebar_older: "Zamani zaidi",
};

export const TRANSLATIONS: Record<LangCode, Dict> = { en, sw };
