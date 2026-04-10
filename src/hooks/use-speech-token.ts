"use client";

import { useQuery } from "@tanstack/react-query";

interface TokenResponse {
  token: string;
  region: string;
  expiresAt: number;
}

async function fetchSpeechToken(): Promise<TokenResponse> {
  const res = await fetch("/api/speech/token", { method: "POST" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Speech token fetch failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as TokenResponse;
  if (!data.token || !data.region || !data.expiresAt) {
    throw new Error("Invalid token response");
  }
  return data;
}

export function useSpeechToken() {
  return useQuery({
    queryKey: ["speech-token"],
    queryFn: fetchSpeechToken,
    staleTime: 50_000, // refresh 10s before 60s TTL
    refetchInterval: 50_000,
    retry: 2,
    refetchOnWindowFocus: true,
  });
}
