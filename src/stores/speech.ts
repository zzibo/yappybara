import { create } from "zustand";
import type { PaceInfo } from "@/lib/pace";
import type { WordScore } from "@/types";

interface SpeechState {
  cursorIndex: number;
  scoredWords: Map<number, WordScore>;
  interimWordIndices: Set<number>;
  currentPace: PaceInfo | null;

  moveCursor: (index: number) => void;
  scoreWords: (words: WordScore[], startRefIndex: number) => void;
  setInterimWords: (indices: number[]) => void;
  updatePace: (pace: PaceInfo) => void;
  reset: () => void;
}

export const useSpeechStore = create<SpeechState>((set) => ({
  cursorIndex: -1,
  scoredWords: new Map(),
  interimWordIndices: new Set(),
  currentPace: null,

  moveCursor: (index) => set({ cursorIndex: index }),

  scoreWords: (words, startRefIndex) =>
    set((state) => {
      const next = new Map(state.scoredWords);
      let refI = startRefIndex;
      for (const w of words) {
        if (w.errorType === "insertion") continue;
        next.set(refI, w);
        refI++;
      }
      return { scoredWords: next };
    }),

  setInterimWords: (indices) =>
    set((state) => {
      // Forward-only: union with existing to prevent flicker
      const next = new Set(state.interimWordIndices);
      for (const i of indices) next.add(i);
      return { interimWordIndices: next };
    }),

  updatePace: (pace) => set({ currentPace: pace }),

  reset: () =>
    set({
      cursorIndex: -1,
      scoredWords: new Map(),
      interimWordIndices: new Set(),
      currentPace: null,
    }),
}));
