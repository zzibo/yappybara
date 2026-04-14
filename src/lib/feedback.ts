import { computeGrade } from "@/lib/scoring";
import { PHONEME_TIPS, worstPhoneme } from "@/lib/suggestions";
import type { PracticeResult, WordScore } from "@/types";

// ── Types ────────────────────────────────────────────────────────────────────

export type StruggleWord = {
  word: string;
  score: number;
  phonemeTip: string | null;
};

export type DetailedFeedback = {
  strengths: string[];
  improvements: string[];
  struggleWords: StruggleWord[];
  paceAnalysis: { averageWpm: number; summary: string };
  hesitationAnalysis: { count: number; nearWords: string[]; summary: string };
  skippedWords: string[];
  encouragement: string;
  takeaway: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildEncouragement(
  grade: string,
  result: PracticeResult,
  streakLength: number,
  hesitationCount: number,
): string {
  if (grade === "S") {
    if (result.prosodyScore !== null && result.prosodyScore >= 85) {
      return "Near-native delivery — your rhythm and intonation are spot on.";
    }
    return "Excellent pronunciation across the board — every sound was clear and accurate.";
  }
  if (grade === "A") {
    if (result.fluencyScore >= 90 && result.accuracyScore < 85) {
      return "Very fluid delivery. Clean up a couple of sounds and you're at the top.";
    }
    if (result.accuracyScore >= 90 && result.fluencyScore < 85) {
      return "Accurate pronunciation — now smooth out the flow and you'll hit the next level.";
    }
    return "Strong overall — clear and confident. Small refinements will make a big difference.";
  }
  if (grade === "B") {
    if (streakLength >= 8) {
      return `You nailed ${streakLength} words straight — proof you can do it. Now extend that consistency to the rest.`;
    }
    if (hesitationCount > 3) {
      return "Decent pronunciation, but the pauses are breaking your flow. Focus on reading more smoothly and the accuracy will follow.";
    }
    return "Solid foundation — the sounds are mostly there. Targeted practice on the weak spots below will push you higher.";
  }
  if (grade === "C") {
    if (hesitationCount > 4) {
      return "You got through it. The pauses are holding you back more than the sounds — build speed and the confidence will follow.";
    }
    return "Keep going — every rep builds muscle memory. Focus on the specific sounds flagged below, one at a time.";
  }
  return "Every attempt rewires your brain. Slow way down, exaggerate every sound, and try this same paragraph again.";
}

function findStreaks(words: WordScore[]): string[] {
  const streaks: string[] = [];
  let run = 0;
  let start = 0;

  for (let i = 0; i < words.length; i++) {
    if (words[i].accuracyScore >= 80 && words[i].errorType !== "omission") {
      if (run === 0) start = i;
      run++;
    } else {
      if (run >= 4) {
        const first = words[start].word;
        const last = words[start + run - 1].word;
        streaks.push(`"${first}" through "${last}" (${run} words perfect)`);
      }
      run = 0;
    }
  }
  if (run >= 4) {
    const first = words[start].word;
    const last = words[start + run - 1].word;
    streaks.push(`"${first}" through "${last}" (${run} words perfect)`);
  }

  return streaks;
}

function paceAdvice(wpm: number): string {
  if (wpm < 110) {
    return `You averaged ${wpm} WPM — quite slow for reading aloud. Your brain likely needs more preview time. Try reading the paragraph silently once before speaking, then look 2-3 words ahead of where your mouth is. Aim for 130+ WPM next attempt.`;
  }
  if (wpm < 130) {
    return `You averaged ${wpm} WPM — a bit below the sweet spot. Shorten the gaps between phrases: once you finish a word, let the next one flow immediately. Push toward 140 WPM by connecting words together instead of pausing between each one.`;
  }
  if (wpm <= 170) {
    return `${wpm} WPM — right in the sweet spot for clear, natural reading. This pace gives listeners time to process while still sounding confident.`;
  }
  if (wpm <= 190) {
    return `You hit ${wpm} WPM — fast enough that clarity may drop. Try breathing for one full second at every period. Open your mouth wider on stressed syllables — larger jaw movement physically slows you down without feeling forced.`;
  }
  return `You averaged ${wpm} WPM — that's racing. Listeners lose comprehension above 180 WPM. Breathe at every comma, pause a full second at every period, and exaggerate your consonants — especially at the ends of words. Target 150 WPM next time.`;
}

function analyzePaceSegments(words: WordScore[]): {
  averageWpm: number;
  summary: string;
} {
  const timed = words.filter((w) => w.offsetMs != null && w.durationMs != null);
  if (timed.length < 3) return { averageWpm: 0, summary: "Not enough data to analyze pace." };

  const totalDuration =
    timed[timed.length - 1].offsetMs! + timed[timed.length - 1].durationMs! - timed[0].offsetMs!;
  const averageWpm = totalDuration > 0 ? Math.round((timed.length / totalDuration) * 60_000) : 0;

  // Split into thirds to detect acceleration/deceleration
  const third = Math.ceil(timed.length / 3);
  const segments = [
    timed.slice(0, third),
    timed.slice(third, third * 2),
    timed.slice(third * 2),
  ].filter((s) => s.length >= 2);

  const segmentWpms = segments.map((seg) => {
    const dur = seg[seg.length - 1].offsetMs! + seg[seg.length - 1].durationMs! - seg[0].offsetMs!;
    return dur > 0 ? Math.round((seg.length / dur) * 60_000) : 0;
  });

  let summary = paceAdvice(averageWpm);

  if (segmentWpms.length >= 2) {
    const first = segmentWpms[0];
    const last = segmentWpms[segmentWpms.length - 1];
    const diff = last - first;

    if (diff > 20) {
      summary += ` You also sped up from ${first} to ${last} WPM — the last third was rushed. Consciously slow down as you approach the end of the paragraph.`;
    } else if (diff < -20) {
      summary += ` You slowed from ${first} to ${last} WPM toward the end — this can signal fatigue or tricky words ahead. Preview the full text before starting so nothing catches you off guard.`;
    }
  }

  return { averageWpm, summary };
}

type PauseInfo = { word: string; gapMs: number };

function findHesitations(words: WordScore[]): {
  count: number;
  nearWords: string[];
  summary: string;
} {
  const pauses: PauseInfo[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    const curr = words[i];
    const next = words[i + 1];
    if (curr.offsetMs != null && curr.durationMs != null && next.offsetMs != null) {
      const gap = next.offsetMs - (curr.offsetMs + curr.durationMs);
      if (gap > 800) {
        pauses.push({ word: next.word, gapMs: gap });
      }
    }
  }

  const count = pauses.length;
  const nearWords = pauses.slice(0, 3).map((p) => p.word);

  if (count === 0) {
    return { count, nearWords, summary: "No hesitations — smooth, connected reading throughout." };
  }

  // Find the longest pause for specific feedback
  const worst = pauses.reduce((a, b) => (a.gapMs > b.gapMs ? a : b));
  const worstSec = (worst.gapMs / 1000).toFixed(1);

  let summary: string;
  if (count <= 2) {
    summary = `${count} pause${count > 1 ? "s" : ""} — longest was ${worstSec}s before "${worst.word}". Try reading that sentence 3 times in a row until the words flow without stopping. Breathe through your nose during pauses instead of saying "um".`;
  } else if (count <= 5) {
    summary = `${count} pauses (longest: ${worstSec}s before "${worst.word}"). Read the full paragraph silently first, then speak — your brain needs to see the words before your mouth says them. Look 2-3 words ahead while reading to build your eye-voice buffer.`;
  } else {
    summary = `${count} pauses detected (longest: ${worstSec}s before "${worst.word}"). Start slower — it's easier to speed up smooth speech than to smooth out choppy fast speech. Read the text silently twice, then try again at 70% speed. Exaggerate connecting the end of each word to the start of the next.`;
  }

  return { count, nearWords, summary };
}

// ── Public API ───────────────────────────────────────────────────────────────

export function generateDetailedFeedback(
  result: PracticeResult,
  _referenceText: string,
): DetailedFeedback {
  const { words, overallScore } = result;
  const grade = computeGrade(overallScore);

  // Strengths — reference actual data
  const strengths: string[] = [];
  const streaks = findStreaks(words);
  if (streaks.length > 0) {
    const s = streaks[0];
    const match = s.match(/\((\d+) words/);
    const count = match ? match[1] : "";
    strengths.push(`${count}-word streak ${s.replace(` (${count} words perfect)`, "")} — perfect pronunciation throughout.`);
  }
  if (result.completenessScore >= 95) {
    strengths.push("You spoke every word without skipping — that completeness builds real fluency.");
  }
  if (result.prosodyScore !== null && result.prosodyScore >= 80) {
    strengths.push(`Rhythm score ${Math.round(result.prosodyScore)}/100 — your stress patterns sound natural, which means you're stressing content words and reducing function words correctly.`);
  } else if (result.prosodyScore !== null && result.prosodyScore >= 60) {
    strengths.push(`Rhythm score ${Math.round(result.prosodyScore)}/100 — some natural stress patterns coming through.`);
  }
  if (result.fluencyScore >= 85) {
    strengths.push(`Fluency at ${Math.round(result.fluencyScore)}/100 — smooth, connected delivery with minimal breaks.`);
  }
  if (strengths.length === 0) {
    strengths.push("You completed the practice — every rep builds muscle memory for the sounds your mouth needs to learn.");
  }

  // Struggle words
  const problematic = words
    .filter(
      (w) => w.accuracyScore < 80 && w.errorType !== "omission" && w.errorType !== "insertion",
    )
    .sort((a, b) => a.accuracyScore - b.accuracyScore)
    .slice(0, 3);

  const struggleWords: StruggleWord[] = problematic.map((w) => {
    const phoneme = worstPhoneme(w);
    const phonemeTip = phoneme
      ? (PHONEME_TIPS[phoneme] ?? `Focus on the /${phoneme}/ sound.`)
      : null;
    return { word: w.word, score: w.accuracyScore, phonemeTip };
  });

  // Improvements
  const improvements: string[] = struggleWords.map((sw) => {
    const tip = sw.phonemeTip ? ` — ${sw.phonemeTip}` : "";
    return `"${sw.word}" (${Math.round(sw.score)})${tip}`;
  });

  // Pace
  const paceAnalysis = analyzePaceSegments(words);

  // Hesitations
  const hesitationAnalysis = findHesitations(words);

  // Skipped
  const skippedWords = words.filter((w) => w.errorType === "omission").map((w) => w.word);

  // Encouragement — data-driven, not grade platitudes
  const longestStreak = streaks.length > 0 ? parseInt(streaks[0].match(/\((\d+)/)?.[1] ?? "0") : 0;
  const encouragement = buildEncouragement(grade, result, longestStreak, hesitationAnalysis.count);

  // Takeaway — always: metric + specific detail + physical drill
  let takeaway: string;
  if (grade === "S" || grade === "A") {
    if (paceAnalysis.averageWpm > 0 && paceAnalysis.averageWpm < 140) {
      takeaway = `Your pronunciation is strong — now push the pace. You averaged ${paceAnalysis.averageWpm} WPM; try this same paragraph again targeting 150+ WPM. Look 2-3 words ahead while speaking to build your eye-voice buffer.`;
    } else if (result.prosodyScore !== null && result.prosodyScore < 75) {
      takeaway = `Sounds are clean — now add expression. Try the exaggeration drill: read the paragraph in a wildly over-the-top dramatic voice, then read it normally. The residual energy will make your delivery more dynamic.`;
    } else {
      takeaway = "You've mastered this difficulty level. Move to a harder paragraph to keep building — comfort zones don't build skills.";
    }
  } else if (struggleWords.length > 0) {
    const sw = struggleWords[0];
    if (sw.phonemeTip) {
      takeaway = `Your biggest blocker is "${sw.word}" (scored ${Math.round(sw.score)}). ${sw.phonemeTip} Say "${sw.word}" slowly 10 times, exaggerating the tricky sound, then read the full sentence it appears in 3 times.`;
    } else {
      takeaway = `Focus on "${sw.word}" (scored ${Math.round(sw.score)}). Say it slowly 10 times, exaggerating each syllable. Then read the full sentence it appears in 3 times until it flows naturally.`;
    }
  } else if (hesitationAnalysis.count > 3) {
    takeaway = `You hesitated ${hesitationAnalysis.count} times. Read the paragraph silently twice to preview every word, then speak it out loud. The goal: zero pauses over 1 second. Your eyes need to run ahead of your mouth.`;
  } else if (paceAnalysis.averageWpm > 180) {
    takeaway = `Pace is your main issue at ${paceAnalysis.averageWpm} WPM. Read this paragraph again, but breathe at every period and pause at every comma. Time yourself — aim for 150 WPM. Clarity always beats speed.`;
  } else {
    takeaway = "Read the same paragraph again — research shows repeated reading is the single most effective technique. Each rep reduces cognitive load, freeing your brain to focus on sounds instead of word recognition.";
  }

  return {
    strengths,
    improvements,
    struggleWords,
    paceAnalysis,
    hesitationAnalysis,
    skippedWords,
    encouragement,
    takeaway,
  };
}
