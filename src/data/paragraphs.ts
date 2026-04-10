import type { Paragraph } from "@/types";

export const paragraphs: Paragraph[] = [
  // Everyday conversations
  {
    id: "ev-01",
    category: "everyday",
    text: "Could you let me know when the package arrives? I ordered it last Thursday and it should have been here by now. The tracking page just says it's somewhere between the distribution center and my front door, which isn't particularly helpful.",
  },
  {
    id: "ev-02",
    category: "everyday",
    text: "I was thinking we could grab coffee before the meeting starts. There's a place two blocks from the office that does excellent flat whites — small, a bit tucked away, but worth the detour. We'd only need about twenty minutes.",
  },
  {
    id: "ev-03",
    category: "everyday",
    text: "The reservation is under my name for seven o'clock. They said the wait can be long on Saturdays, so it's better to arrive a few minutes early. If you get there before I do, just tell them you're with the Harlow party.",
  },
  {
    id: "ev-04",
    category: "everyday",
    text: "I keep meaning to call my grandmother back. She left a voicemail last Sunday — something about a recipe she wanted to share. Every time I remember, it's either too late at night or I'm already buried in something else.",
  },
  {
    id: "ev-05",
    category: "everyday",
    text: "We ran out of the good olive oil and I forgot to add it to the list. Would you mind picking some up on your way home? The one in the green tin, not the plastic bottle — it tastes completely different and it matters for this dish.",
  },

  // Interesting facts
  {
    id: "fact-01",
    category: "facts",
    text: "Mantis shrimp can punch with the force of a bullet, striking at speeds of over twenty meters per second. The blow generates a cavitation bubble whose collapse creates a shockwave nearly as destructive as the punch itself — effectively hitting prey twice with a single strike.",
  },
  {
    id: "fact-02",
    category: "facts",
    text: "The Voynich manuscript, a heavily illustrated medieval text, has resisted all attempts at decipherment since its rediscovery in 1912. Carbon dating places its creation in the early fifteenth century, and its script appears in no known language or cipher system.",
  },
  {
    id: "fact-03",
    category: "facts",
    text: "Trees in a forest share nutrients and chemical signals through underground fungal networks, sometimes called the wood wide web. Larger trees have been observed directing carbon toward smaller seedlings — behavior that looks remarkably like intentional resource sharing.",
  },
  {
    id: "fact-04",
    category: "facts",
    text: "Saturn's rings are far younger than the planet itself — likely only a few hundred million years old — formed when moons or comets were shredded by tidal forces. At current erosion rates, they could vanish entirely within a hundred million years.",
  },
  {
    id: "fact-05",
    category: "facts",
    text: "Tardigrades can survive conditions lethal to nearly every other animal: total vacuum, intense radiation, temperatures ranging from near absolute zero to over 150 degrees Celsius. They do this by entering cryptobiosis, replacing water in their cells with a glass-like protein.",
  },

  // Professional scenarios
  {
    id: "pro-01",
    category: "professional",
    text: "Before we move to the next agenda item, I'd like to circle back to the Q3 metrics. The conversion numbers are stronger than we projected, but customer acquisition cost is trending upward. We should flag that for the finance review and decide whether to adjust the paid strategy.",
  },
  {
    id: "pro-02",
    category: "professional",
    text: "Just following up on the proposal I sent over last Wednesday. I know everyone's schedule has been packed, so no pressure — I just wanted to make sure it didn't get buried. Happy to set up a brief call if it would be easier to talk through the pricing section.",
  },
  {
    id: "pro-03",
    category: "professional",
    text: "The rollout is on track for the fifteenth, contingent on the QA sign-off we're expecting early next week. The main risk is the integration with the legacy billing system — we have a workaround scoped, but it adds roughly two days if we need to implement it.",
  },
  {
    id: "pro-04",
    category: "professional",
    text: "I'm presenting to the board on Thursday morning, so I need the final data by Wednesday at noon at the latest. If any of the regional numbers shift after that, flag it to me directly and I'll decide whether to update the slides or address it verbally in the room.",
  },
  {
    id: "pro-05",
    category: "professional",
    text: "We're seeing strong engagement on the new onboarding flow — completion rates are up twelve percent week over week. The hypothesis is that the progress indicator is driving it. I'd recommend we hold off on the next iteration until we have a full two-week cohort to confirm.",
  },

  // Descriptive passages
  {
    id: "desc-01",
    category: "descriptive",
    text: "The market sprawled across four city blocks, smelling of citrus and damp stone. Vendors arranged pyramids of pomegranates beside towers of spiced nuts, their voices layered into a constant, comfortable noise. Late afternoon light fell sideways through canvas awnings, turning everything golden.",
  },
  {
    id: "desc-02",
    category: "descriptive",
    text: "The soup arrived in a shallow bowl, pale broth barely trembling, a single soft-boiled egg halved on top. A few rings of scallion floated at the edge. It tasted of patience — the kind that only comes from something that has been simmering for most of the day.",
  },
  {
    id: "desc-03",
    category: "descriptive",
    text: "From the ridge, the valley below looked like a rumpled green blanket thrown across a table. A river caught the late light and flashed silver between the trees. Somewhere behind the clouds, the sun was still there, softening everything it couldn't quite reach.",
  },
  {
    id: "desc-04",
    category: "descriptive",
    text: "The bookshop was the kind where the shelves went up to the ceiling and the ladders were real, not decorative. It smelled of old paper and something faintly floral — maybe a candle, maybe just decades of accumulated reading. The owner barely looked up when you came in.",
  },
  {
    id: "desc-05",
    category: "descriptive",
    text: "She set the coffee down without being asked — black, in a small ceramic cup that felt serious in your hand. Outside, the rain had started again, tapping unevenly against the glass. It was exactly the kind of afternoon that makes you order another thing just to stay a little longer.",
  },

  // Tongue-twister-adjacent
  {
    id: "twist-01",
    category: "twisters",
    text: "The sixth sick sheikh's sixth sheep is sick. She sells seashells by the seashore, but the shells she sells are surely not seashore shells. Susie works in a shoeshine shop where she shines and sells shoes she sews.",
  },
  {
    id: "twist-02",
    category: "twisters",
    text: "Freshly fried flying fish fill the Friday fish fryer. The fryer flips the fillets with practiced flicks, producing perfectly crisp, flaky pieces that the proprietor proudly places on paper plates.",
  },
  {
    id: "twist-03",
    category: "twisters",
    text: "Red lorry, yellow lorry — three red lorries rolled rapidly down the rural road, rattling and lurching over every ridge. The drivers, rather rattled themselves, rallied their nerves by reciting road rules rhythmically.",
  },
  {
    id: "twist-04",
    category: "twisters",
    text: "The precise price of the Swiss wristwatch is a trivial trifle compared to the exquisite craftsmanship required to construct its intricate crystal mechanism, which ticks and tocks in strictly measured increments.",
  },
  {
    id: "twist-05",
    category: "twisters",
    text: "Brisk brave brigadiers brandish broad bright blades. They blend brightly as they briskly march through the brigade's broad, broken, bridge-crossed bramble path at the break of dawn.",
  },

  // Storytelling
  {
    id: "story-01",
    category: "stories",
    text: "She found the letter on a Tuesday, tucked between a water bill and a pizza flyer. No return address. Her name was written in handwriting she hadn't seen in eleven years. She stood in the hallway for a long time before she opened it.",
  },
  {
    id: "story-02",
    category: "stories",
    text: "The lighthouse had been decommissioned for decades, but someone was still climbing the stairs each night. The neighbors had stopped talking about it. Whatever arrangement had been made with whoever — or whatever — lived there now, it seemed to be holding.",
  },
  {
    id: "story-03",
    category: "stories",
    text: "He had promised himself he wouldn't look back. He looked back. The town was already small, already just a smear of lights in the valley. He thought he might feel something — relief, maybe, or grief. What he actually felt was hungry, and that seemed about right.",
  },
  {
    id: "story-04",
    category: "stories",
    text: "The map was wrong in exactly the way old maps are wrong: everything was there, but nothing was where it should be. She had been walking for three hours and the river was still, according to the map, one hour ahead. The forest disagreed.",
  },
  {
    id: "story-05",
    category: "stories",
    text: "They had been arguing about the same thing for forty years, using different words each time. Tonight it was about the thermostat. But really — they both knew this — it was about who had to call the plumber back in 1987, and whether the whole thing had been worth it.",
  },
];
