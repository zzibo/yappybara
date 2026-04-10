export type TopicCategory = "cs" | "webdev" | "systems" | "data" | "general";

export type Topic = {
  id: string;
  prompt: string;
  category: TopicCategory;
};

export const topics: Topic[] = [
  // ── Computer Science fundamentals ──────────────────────────────────────────
  {
    id: "cs-01",
    category: "cs",
    prompt: "Explain recursion. What is it, when would you use it, and what are the tradeoffs?",
  },
  {
    id: "cs-02",
    category: "cs",
    prompt: "What is Big O notation and why do engineers care about it?",
  },
  {
    id: "cs-03",
    category: "cs",
    prompt:
      "Explain the difference between a stack and a queue. Give a real-world use case for each.",
  },
  {
    id: "cs-04",
    category: "cs",
    prompt: "What is a hash table and how does it achieve O(1) average lookup?",
  },
  {
    id: "cs-05",
    category: "cs",
    prompt: "Explain pointers and references. Why do they matter in languages like C?",
  },
  {
    id: "cs-06",
    category: "cs",
    prompt: "What is dynamic programming? Walk through the core idea and when you'd use it.",
  },

  // ── Web development ────────────────────────────────────────────────────────
  {
    id: "web-01",
    category: "webdev",
    prompt: "Explain React hooks to a developer who only knows class components.",
  },
  {
    id: "web-02",
    category: "webdev",
    prompt: "What is the virtual DOM and why does React use it?",
  },
  {
    id: "web-03",
    category: "webdev",
    prompt: "Explain the difference between server-side rendering and client-side rendering.",
  },
  {
    id: "web-04",
    category: "webdev",
    prompt: "What is CORS? Why does it exist and how does it work?",
  },
  {
    id: "web-05",
    category: "webdev",
    prompt: "Explain how HTTPS keeps data secure when you browse the web.",
  },
  {
    id: "web-06",
    category: "webdev",
    prompt: "What is a RESTful API? What makes an API actually RESTful?",
  },
  {
    id: "web-07",
    category: "webdev",
    prompt: "Explain the event loop in JavaScript. Why can't you block it?",
  },

  // ── Systems ────────────────────────────────────────────────────────────────
  {
    id: "sys-01",
    category: "systems",
    prompt: "Explain how a CPU cache works and why it matters for performance.",
  },
  {
    id: "sys-02",
    category: "systems",
    prompt: "What is the difference between a process and a thread?",
  },
  {
    id: "sys-03",
    category: "systems",
    prompt: "Explain what a Docker container is and how it differs from a virtual machine.",
  },
  {
    id: "sys-04",
    category: "systems",
    prompt: "What is a load balancer and why do large systems need them?",
  },
  {
    id: "sys-05",
    category: "systems",
    prompt: "Explain the CAP theorem. Why can't you have all three?",
  },
  {
    id: "sys-06",
    category: "systems",
    prompt: "What is a race condition? Give an example and explain how to prevent one.",
  },

  // ── Data ──────────────────────────────────────────────────────────────────
  {
    id: "data-01",
    category: "data",
    prompt: "Explain the difference between SQL and NoSQL databases. When would you pick each?",
  },
  {
    id: "data-02",
    category: "data",
    prompt: "What is database indexing? How does it speed up queries and what are the costs?",
  },
  {
    id: "data-03",
    category: "data",
    prompt: "Explain database normalization. Why do we do it and when might you denormalize?",
  },
  {
    id: "data-04",
    category: "data",
    prompt: "What is a database transaction and what does ACID mean?",
  },
  {
    id: "data-05",
    category: "data",
    prompt: "Explain the difference between a join and a subquery. When would you use each?",
  },

  // ── General tech ──────────────────────────────────────────────────────────
  {
    id: "gen-01",
    category: "general",
    prompt: "Explain git in terms a non-programmer could understand.",
  },
  {
    id: "gen-02",
    category: "general",
    prompt: "What is machine learning, really? How is it different from regular programming?",
  },
  {
    id: "gen-03",
    category: "general",
    prompt: "Explain what a large language model does under the hood, without hand-waving.",
  },
  {
    id: "gen-04",
    category: "general",
    prompt: "What is the difference between authentication and authorization?",
  },
  {
    id: "gen-05",
    category: "general",
    prompt: "Explain end-to-end encryption and why it matters.",
  },
  {
    id: "gen-06",
    category: "general",
    prompt: "What is technical debt? Give a concrete example and explain why it accumulates.",
  },
  {
    id: "gen-07",
    category: "general",
    prompt: "Explain what a compiler does and how it differs from an interpreter.",
  },
];
