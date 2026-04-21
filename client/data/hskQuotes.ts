import type { HskLevel } from "@/types";

export interface HskQuoteData {
  original: string;
  source: string;
  sourceEn: string;
  literal: string;
  modern: string;
  literalEn: string;
  modernEn: string;
}

export const HSK_QUOTES: Record<HskLevel, HskQuoteData> = {
  1: {
    original: "学而不厌，诲人不倦。",
    source: "論語",
    sourceEn: "Analects of Confucius",
    literal: "学んで飽きず、人を教えて疲れない。",
    modern: "学ぶことをやめず、教えることにも情熱を失わない姿勢。",
    literalEn: "Learn without satiation; teach without weariness.",
    modernEn:
      "Never stop learning, and never tire of guiding others. This is the spirit of a true lifelong learner.",
  },
  2: {
    original: "温故而知新，可以为师矣。",
    source: "論語",
    sourceEn: "Analects of Confucius",
    literal: "故（ふる）きを温（たず）ねて新しきを知れば、師となることができる。",
    modern: "過去の学びを振り返り、そこから新たな理解を生み出せる人こそ、教えるに値する。",
    literalEn: "Review the old to understand the new — then you can become a teacher.",
    modernEn:
      "By reflecting on what you already know and finding fresh insights in it, you reach a level where you can guide others.",
  },
  3: {
    original: "三人行，必有我师焉。择其善者而从之，其不善者而改之。",
    source: "論語",
    sourceEn: "Analects of Confucius",
    literal:
      "三人で行けば、必ず我が師となる者がいる。その善き者を選んでこれに従い、その善からざる者はこれを改める。",
    modern:
      "誰といても、必ず学ぶべき相手がいる。良いところは取り入れ、悪いところは自分を省みて正せ。",
    literalEn:
      "When three walk together, one is surely my teacher. Follow the good in them; correct in yourself what they do poorly.",
    modernEn:
      "No matter who you are with, there is always someone to learn from. Adopt their strengths, and let their faults be a mirror for self-reflection.",
  },
  4: {
    original: "山穷水尽疑无路，柳暗花明又一村。",
    source: "陸游",
    sourceEn: "Lu You (Song Dynasty poet)",
    literal:
      "山が尽き水が尽き、道なきかと疑う。柳は暗く花は明るく、また一つの村あり。",
    modern: "もう道はないと思ったその先に、思いがけず新しい世界が開けることがある。",
    literalEn:
      "Mountains end, waters end — one fears there is no way forward. Yet through shadowed willows and bright blossoms, a village appears.",
    modernEn:
      "Just when you feel there is no path ahead, an unexpected new world opens before you. Never give up — a breakthrough is always possible.",
  },
  5: {
    original: "长风破浪会有时，直挂云帆济沧海。",
    source: "李白",
    sourceEn: "Li Bai (Tang Dynasty poet)",
    literal: "長風が波を破る時は必ず来る。まっすぐ雲の帆を掲げて大海を渡る。",
    modern: "今は逆風でも、必ず大きく前進できる時が来る。その時は堂々と進めばよい。",
    literalEn:
      "The moment will come when great winds shatter the waves; then raise the cloud-sail and cross the vast blue sea.",
    modernEn:
      "Even against headwinds, the time to surge forward will surely arrive. When it does, set your sail and press boldly across the open ocean.",
  },
  6: {
    original: "会当凌绝顶，一览众山小。",
    source: "杜甫",
    sourceEn: "Du Fu (Tang Dynasty poet)",
    literal: "必ずまさに絶頂に凌（のぼ）り、ひとたび見渡せば群山は小さい。",
    modern:
      "頂点に立てば、それまで大きく見えた困難も小さく感じられる。だから高みを目指せ。",
    literalEn:
      "I will reach the very summit, and from there all other mountains will look small.",
    modernEn:
      "Once you stand at the top, every obstacle that once seemed great will appear small. Keep aiming for the heights.",
  },
};
