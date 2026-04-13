export type YapType = "interview" | "casual";

export type TopicCategory =
  | "cs"
  | "webdev"
  | "systems"
  | "data"
  | "general"
  | "life"
  | "opinions"
  | "hypothetical"
  | "culture"
  | "wildcard";

export type Topic = {
  id: string;
  prompt: string;
  category: TopicCategory;
  yapType: YapType;
};

export const topics: Topic[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // INTERVIEW — SWE interview prep topics
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Computer Science fundamentals ──────────────────────────────────────────
  {
    id: "cs-01",
    category: "cs",
    yapType: "interview",
    prompt: "Explain recursion. What is it, when would you use it, and what are the tradeoffs?",
  },
  {
    id: "cs-02",
    category: "cs",
    yapType: "interview",
    prompt: "What is Big O notation and why do engineers care about it?",
  },
  {
    id: "cs-03",
    category: "cs",
    yapType: "interview",
    prompt:
      "Explain the difference between a stack and a queue. Give a real-world use case for each.",
  },
  {
    id: "cs-04",
    category: "cs",
    yapType: "interview",
    prompt: "What is a hash table and how does it achieve O(1) average lookup?",
  },
  {
    id: "cs-05",
    category: "cs",
    yapType: "interview",
    prompt: "Explain pointers and references. Why do they matter in languages like C?",
  },
  {
    id: "cs-06",
    category: "cs",
    yapType: "interview",
    prompt: "What is dynamic programming? Walk through the core idea and when you'd use it.",
  },

  // ── Web development ────────────────────────────────────────────────────────
  {
    id: "web-01",
    category: "webdev",
    yapType: "interview",
    prompt: "Explain React hooks to a developer who only knows class components.",
  },
  {
    id: "web-02",
    category: "webdev",
    yapType: "interview",
    prompt: "What is the virtual DOM and why does React use it?",
  },
  {
    id: "web-03",
    category: "webdev",
    yapType: "interview",
    prompt: "Explain the difference between server-side rendering and client-side rendering.",
  },
  {
    id: "web-04",
    category: "webdev",
    yapType: "interview",
    prompt: "What is CORS? Why does it exist and how does it work?",
  },
  {
    id: "web-05",
    category: "webdev",
    yapType: "interview",
    prompt: "Explain how HTTPS keeps data secure when you browse the web.",
  },
  {
    id: "web-06",
    category: "webdev",
    yapType: "interview",
    prompt: "What is a RESTful API? What makes an API actually RESTful?",
  },
  {
    id: "web-07",
    category: "webdev",
    yapType: "interview",
    prompt: "Explain the event loop in JavaScript. Why can't you block it?",
  },

  // ── Systems ────────────────────────────────────────────────────────────────
  {
    id: "sys-01",
    category: "systems",
    yapType: "interview",
    prompt: "Explain how a CPU cache works and why it matters for performance.",
  },
  {
    id: "sys-02",
    category: "systems",
    yapType: "interview",
    prompt: "What is the difference between a process and a thread?",
  },
  {
    id: "sys-03",
    category: "systems",
    yapType: "interview",
    prompt: "Explain what a Docker container is and how it differs from a virtual machine.",
  },
  {
    id: "sys-04",
    category: "systems",
    yapType: "interview",
    prompt: "What is a load balancer and why do large systems need them?",
  },
  {
    id: "sys-05",
    category: "systems",
    yapType: "interview",
    prompt: "Explain the CAP theorem. Why can't you have all three?",
  },
  {
    id: "sys-06",
    category: "systems",
    yapType: "interview",
    prompt: "What is a race condition? Give an example and explain how to prevent one.",
  },

  // ── Data ──────────────────────────────────────────────────────────────────
  {
    id: "data-01",
    category: "data",
    yapType: "interview",
    prompt: "Explain the difference between SQL and NoSQL databases. When would you pick each?",
  },
  {
    id: "data-02",
    category: "data",
    yapType: "interview",
    prompt: "What is database indexing? How does it speed up queries and what are the costs?",
  },
  {
    id: "data-03",
    category: "data",
    yapType: "interview",
    prompt: "Explain database normalization. Why do we do it and when might you denormalize?",
  },
  {
    id: "data-04",
    category: "data",
    yapType: "interview",
    prompt: "What is a database transaction and what does ACID mean?",
  },
  {
    id: "data-05",
    category: "data",
    yapType: "interview",
    prompt: "Explain the difference between a join and a subquery. When would you use each?",
  },

  // ── General tech ──────────────────────────────────────────────────────────
  {
    id: "gen-01",
    category: "general",
    yapType: "interview",
    prompt: "Explain git in terms a non-programmer could understand.",
  },
  {
    id: "gen-02",
    category: "general",
    yapType: "interview",
    prompt: "What is machine learning, really? How is it different from regular programming?",
  },
  {
    id: "gen-03",
    category: "general",
    yapType: "interview",
    prompt: "Explain what a large language model does under the hood, without hand-waving.",
  },
  {
    id: "gen-04",
    category: "general",
    yapType: "interview",
    prompt: "What is the difference between authentication and authorization?",
  },
  {
    id: "gen-05",
    category: "general",
    yapType: "interview",
    prompt: "Explain end-to-end encryption and why it matters.",
  },
  {
    id: "gen-06",
    category: "general",
    yapType: "interview",
    prompt: "What is technical debt? Give a concrete example and explain why it accumulates.",
  },
  {
    id: "gen-07",
    category: "general",
    yapType: "interview",
    prompt: "Explain what a compiler does and how it differs from an interpreter.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CASUAL — just practice talking about anything
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Life & personal ───────────────────────────────────────────────────────
  {
    id: "life-01",
    category: "life",
    yapType: "casual",
    prompt: "Describe your ideal morning routine. What makes a great start to the day?",
  },
  {
    id: "life-02",
    category: "life",
    yapType: "casual",
    prompt: "Talk about a skill you picked up as an adult. How did you learn it?",
  },
  {
    id: "life-03",
    category: "life",
    yapType: "casual",
    prompt: "What's the best piece of advice you've ever received? Why did it stick?",
  },
  {
    id: "life-04",
    category: "life",
    yapType: "casual",
    prompt: "Describe a meal that means something to you. What makes it special?",
  },
  {
    id: "life-05",
    category: "life",
    yapType: "casual",
    prompt: "Talk about a place you've been to that surprised you.",
  },
  {
    id: "life-06",
    category: "life",
    yapType: "casual",
    prompt: "What's something you changed your mind about in the last few years?",
  },

  // ── Opinions & takes ──────────────────────────────────────────────────────
  {
    id: "opin-01",
    category: "opinions",
    yapType: "casual",
    prompt: "Is it better to be a generalist or a specialist? Make your case.",
  },
  {
    id: "opin-02",
    category: "opinions",
    yapType: "casual",
    prompt: "Should everyone learn to cook? Why or why not?",
  },
  {
    id: "opin-03",
    category: "opinions",
    yapType: "casual",
    prompt: "What's an unpopular opinion you hold that you can actually defend?",
  },
  {
    id: "opin-04",
    category: "opinions",
    yapType: "casual",
    prompt: "Is social media doing more good or harm? Argue one side.",
  },
  {
    id: "opin-05",
    category: "opinions",
    yapType: "casual",
    prompt: "What's overrated that everyone seems to love? Explain why.",
  },
  {
    id: "opin-06",
    category: "opinions",
    yapType: "casual",
    prompt: "Remote work vs. office work — which is actually better and why?",
  },

  // ── Hypotheticals ─────────────────────────────────────────────────────────
  {
    id: "hypo-01",
    category: "hypothetical",
    yapType: "casual",
    prompt: "If you could have dinner with anyone, living or dead, who would it be and why?",
  },
  {
    id: "hypo-02",
    category: "hypothetical",
    yapType: "casual",
    prompt: "You wake up with the ability to speak every language fluently. What do you do first?",
  },
  {
    id: "hypo-03",
    category: "hypothetical",
    yapType: "casual",
    prompt: "If you had to teach a class on anything (not your job), what would it be?",
  },
  {
    id: "hypo-04",
    category: "hypothetical",
    yapType: "casual",
    prompt: "You get one year off with full pay. How do you spend it?",
  },
  {
    id: "hypo-05",
    category: "hypothetical",
    yapType: "casual",
    prompt: "If you could instantly master one musical instrument, which one and why?",
  },
  {
    id: "hypo-06",
    category: "hypothetical",
    yapType: "casual",
    prompt: "You're building a city from scratch. What's the first thing you design?",
  },

  // ── Culture & media ───────────────────────────────────────────────────────
  {
    id: "cult-01",
    category: "culture",
    yapType: "casual",
    prompt: "Talk about a book, movie, or show that genuinely changed how you think.",
  },
  {
    id: "cult-02",
    category: "culture",
    yapType: "casual",
    prompt: "What makes a great story? What keeps you hooked?",
  },
  {
    id: "cult-03",
    category: "culture",
    yapType: "casual",
    prompt: "Describe a song or album that you associate with a specific time in your life.",
  },
  {
    id: "cult-04",
    category: "culture",
    yapType: "casual",
    prompt: "What's a tradition or custom you find interesting? Explain it to someone unfamiliar.",
  },
  {
    id: "cult-05",
    category: "culture",
    yapType: "casual",
    prompt: "Talk about a hobby or subculture that most people know nothing about.",
  },

  // ── Wildcard ──────────────────────────────────────────────────────────────
  {
    id: "wild-01",
    category: "wildcard",
    yapType: "casual",
    prompt: "Explain something you know weirdly well that has nothing to do with your job.",
  },
  {
    id: "wild-02",
    category: "wildcard",
    yapType: "casual",
    prompt: "Convince someone to visit your favorite neighborhood or town.",
  },
  {
    id: "wild-03",
    category: "wildcard",
    yapType: "casual",
    prompt: "What's a small daily habit that makes a bigger difference than people realize?",
  },
  {
    id: "wild-04",
    category: "wildcard",
    yapType: "casual",
    prompt: "Teach someone something useful in under two minutes. Go.",
  },
  {
    id: "wild-05",
    category: "wildcard",
    yapType: "casual",
    prompt: "What would you tell your 18-year-old self? Be honest.",
  },
  {
    id: "wild-06",
    category: "wildcard",
    yapType: "casual",
    prompt: "Pick a random object near you and give a two-minute pitch for why it's the best thing ever.",
  },
];
