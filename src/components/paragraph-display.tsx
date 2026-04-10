"use client";

import type { PhonemeScore } from "@/types";

export type WordState =
  | "idle"
  | "hearing"
  | "active"
  | "spoken"
  | "correct"
  | "partial"
  | "error"
  | "omitted"
  | "inserted";

export type DisplayWord = {
  word: string;
  state: WordState;
  score?: number;
  phonemes?: PhonemeScore[];
  onClick?: () => void;
};

type ParagraphDisplayProps = {
  words: DisplayWord[];
};

function getWordStyle(state: WordState): React.CSSProperties {
  switch (state) {
    case "idle":
      return { color: "var(--yb-text-sub)" };
    case "hearing":
      return { color: "var(--yb-text)", opacity: 0.5 };
    case "active":
      return { color: "var(--yb-text)" };
    case "spoken":
      return { color: "var(--yb-text)", opacity: 0.7 };
    case "correct":
      return { color: "var(--yb-correct)" };
    case "partial":
      return { color: "var(--yb-partial)" };
    case "error":
      return { color: "var(--yb-error)" };
    case "omitted":
      return { color: "var(--yb-text-sub)", textDecoration: "line-through" };
    case "inserted":
      return { color: "var(--yb-text-sub)", fontStyle: "italic" };
  }
}

function getPhonemeColor(score: number): string {
  if (score >= 80) return "var(--yb-correct)";
  if (score >= 50) return "var(--yb-partial)";
  return "var(--yb-error)";
}

function isClickable(state: WordState): boolean {
  return state === "correct" || state === "partial" || state === "error";
}

function hasPhonemeHighlight(state: WordState): boolean {
  return state === "correct" || state === "partial" || state === "error";
}

function renderPhonemeWord(word: string, phonemes: PhonemeScore[]) {
  const totalPhonemes = phonemes.length;
  const charsPerPhoneme = word.length / totalPhonemes;

  return word.split("").map((char, i) => {
    const phonemeIndex = Math.min(Math.floor(i / charsPerPhoneme), totalPhonemes - 1);
    const color = getPhonemeColor(phonemes[phonemeIndex].accuracyScore);

    return (
      <span key={i} style={{ color, transition: "color 150ms ease" }}>
        {char}
      </span>
    );
  });
}

export function ParagraphDisplay({ words }: ParagraphDisplayProps) {
  return (
    <div
      style={{
        maxWidth: "60ch",
        lineHeight: "1.8",
        fontFamily: "var(--font-mono)",
        textAlign: "left",
      }}
    >
      {words.map((w, i) => {
        const clickable = isClickable(w.state);
        const usePhonemes = w.phonemes && w.phonemes.length > 0 && hasPhonemeHighlight(w.state);
        const style = usePhonemes ? {} : getWordStyle(w.state);

        return (
          <span key={i}>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: inline word click */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard nav via Space/R/Esc */}
            <span
              onClick={clickable ? w.onClick : undefined}
              style={{
                ...style,
                transition: "color 150ms ease",
                cursor: clickable ? "pointer" : "default",
                display: "inline-block",
                position: "relative",
              }}
              className={[
                clickable ? "hoverable-word" : "",
                w.state === "active" ? "active-word" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {usePhonemes ? renderPhonemeWord(w.word, w.phonemes!) : w.word}
              {w.state === "active" && (
                <span
                  style={{
                    position: "absolute",
                    bottom: "-2px",
                    left: 0,
                    right: 0,
                    height: "2px",
                    backgroundColor: "var(--yb-main)",
                    animation: "caret-blink 1s step-start infinite",
                  }}
                />
              )}
            </span>
            {i < words.length - 1 && " "}
          </span>
        );
      })}
      <style>{`
        .hoverable-word:hover {
          filter: brightness(1.25);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
    </div>
  );
}
