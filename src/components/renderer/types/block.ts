export type BlockType =
  // Core
  | "heading"
  | "paragraph"
  | "list"
  | "listItem"
  | "table"
  | "tableRow"
  | "tableCell"
  | "code"
  | "inlineCode"
  | "math"
  | "inlineMath"
  | "blockquote"
  | "divider"
  | "image"
  | "link"

  // Education
  | "definition"
  | "concept"
  | "formula"
  | "workedExample"
  | "summary"
  | "keyPoints"
  | "studyTip"
  | "commonMistake"

  // Questions
  | "question"
  | "practiceQuestion"
  | "hint"
  | "answer"
  | "quiz"

  // Advanced
  | "diagram"
  | "graph"
  | "timeline"
  | "flashcard"

  // Misc
  | "note"
  | "warning"
  | "success"

  //Maths
  | "math"
  | "inlineMath"
  | "formula"
  | "equation"
  | "matrix"
  | "reaction"
  | "unit"

  // Chemistry
  | "molecule"
  | "periodic"

  // Physics
  | "fbd"
  | "circuit"
  | "kinematics"

  // Advanced Maths
  | "graph"
  | "geometry";
