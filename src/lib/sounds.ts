let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  return ctx;
}

export function initSounds(): void {
  if (ctx) return;
  ctx = new AudioContext();
}

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function now(): number {
  return getCtx()!.currentTime;
}

export const sounds = {
  click(): void {
    const ac = getCtx();
    if (!ac || reducedMotion()) return;

    const bufferSize = Math.floor(ac.sampleRate * 0.01); // 10ms
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = ac.createBufferSource();
    source.buffer = buffer;

    const gain = ac.createGain();
    const t = now();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.01);

    source.connect(gain);
    gain.connect(ac.destination);
    source.start(t);
  },

  start(): void {
    const ac = getCtx();
    if (!ac || reducedMotion()) return;

    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = "sine";
    const t = now();
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.linearRampToValueAtTime(1200, t + 0.05);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  },

  stop(): void {
    const ac = getCtx();
    if (!ac || reducedMotion()) return;

    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = "sine";
    const t = now();
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(300, t + 0.1);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.13, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  },

  reveal(): void {
    const ac = getCtx();
    if (!ac || reducedMotion()) return;

    const t = now();

    // First note: 880Hz
    const osc1 = ac.createOscillator();
    const gain1 = ac.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, t);
    gain1.gain.setValueAtTime(0, t);
    gain1.gain.linearRampToValueAtTime(0.15, t + 0.005);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    osc1.connect(gain1);
    gain1.connect(ac.destination);
    osc1.start(t);
    osc1.stop(t + 0.1);

    // Second note: 1320Hz, starts after 80ms
    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, t + 0.08);
    gain2.gain.setValueAtTime(0, t + 0.08);
    gain2.gain.linearRampToValueAtTime(0.15, t + 0.085);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.23);
    osc2.connect(gain2);
    gain2.connect(ac.destination);
    osc2.start(t + 0.08);
    osc2.stop(t + 0.23);
  },

  error(): void {
    const ac = getCtx();
    if (!ac || reducedMotion()) return;

    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = "sine";
    const t = now();
    osc.frequency.setValueAtTime(150, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  },
};
