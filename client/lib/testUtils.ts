import { Word, TestQuestion, TestType } from "@/types";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateTestQuestions(
  words: Word[],
  type: TestType,
  count?: number
): TestQuestion[] {
  const unmemorizedWords = words.filter((w) => !w.isMemorized);
  
  if (unmemorizedWords.length === 0) {
    return [];
  }

  const shuffledWords = shuffleArray(unmemorizedWords);
  const selectedWords = count ? shuffledWords.slice(0, count) : shuffledWords;

  return selectedWords.map((word) => {
    const correctAnswer = word.translation;
    
    const otherWords = words.filter((w) => w.id !== word.id);
    const shuffledOthers = shuffleArray(otherWords);
    const wrongAnswers = shuffledOthers.slice(0, 3).map((w) => w.translation);
    
    const allAnswers = shuffleArray([correctAnswer, ...wrongAnswers]);

    return {
      word,
      type,
      options: allAnswers,
      correctAnswer,
    };
  });
}

export function calculateScore(
  answers: { questionIndex: number; answer: string; isCorrect: boolean }[]
): { correct: number; total: number; percentage: number } {
  const correct = answers.filter((a) => a.isCorrect).length;
  const total = answers.length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  
  return { correct, total, percentage };
}
