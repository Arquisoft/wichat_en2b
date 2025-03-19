"use client";

import QuestionGame from "@/components/game/QuestionGame";

export default function Page() {
  return <QuestionGame topic={'Q515'} totalQuestions={'10'} numberOptions={'4'} timerDuration={'20'} question={'What city is shown in the image?'} />;
}
