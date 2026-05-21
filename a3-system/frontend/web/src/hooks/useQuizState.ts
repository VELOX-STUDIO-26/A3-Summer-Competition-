"use client";

import { useState, useCallback } from "react";

interface QuizState {
  // Quiz answer tracking: { resourceId_questionIndex: selectedOptionIndex }
  answers: Record<string, number>;
  // Quiz confidence tracking: { resourceId_questionIndex: confidenceLevel (1-5) }
  confidence: Record<string, number>;
  // Quiz hint tracking: { resourceId_questionIndex: number of hints revealed }
  revealedHints: Record<string, number>;
  // ELI5 toggle: { resourceId_questionIndex: boolean }
  eli5Enabled: Record<string, boolean>;
  // Distractor explanations visibility: { resourceId_questionIndex_optionIndex: boolean }
  showDistractors: Record<string, boolean>;
}

export function useQuizState() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, number>>({});
  const [eli5Enabled, setEli5Enabled] = useState<Record<string, boolean>>({});
  const [showDistractors, setShowDistractors] = useState<Record<string, boolean>>({});

  const selectAnswer = useCallback((key: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [key]: optionIndex }));
  }, []);

  const setConfidenceLevel = useCallback((key: string, level: number) => {
    setConfidence((prev) => ({ ...prev, [key]: level }));
  }, []);

  const revealHint = useCallback((key: string, hintCount: number) => {
    setRevealedHints((prev) => ({ ...prev, [key]: hintCount }));
  }, []);

  const toggleEli5 = useCallback((key: string) => {
    setEli5Enabled((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleDistractor = useCallback((key: string) => {
    setShowDistractors((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetQuiz = useCallback((resourceId: string, questionCount: number) => {
    setAnswers((prev) => {
      const next = { ...prev };
      for (let i = 0; i < questionCount; i++) {
        delete next[`${resourceId}_${i}`];
      }
      return next;
    });
    setConfidence((prev) => {
      const next = { ...prev };
      for (let i = 0; i < questionCount; i++) {
        delete next[`${resourceId}_${i}`];
      }
      return next;
    });
    setRevealedHints((prev) => {
      const next = { ...prev };
      for (let i = 0; i < questionCount; i++) {
        delete next[`${resourceId}_${i}`];
      }
      return next;
    });
    setEli5Enabled((prev) => {
      const next = { ...prev };
      for (let i = 0; i < questionCount; i++) {
        delete next[`${resourceId}_${i}`];
      }
      return next;
    });
  }, []);

  const getQuestionState = useCallback(
    (resourceId: string, questionIndex: number) => {
      const key = `${resourceId}_${questionIndex}`;
      return {
        answer: answers[key],
        confidence: confidence[key] || 0,
        revealedHints: revealedHints[key] || 0,
        eli5Enabled: eli5Enabled[key] || false,
        hasAnswered: answers[key] !== undefined,
      };
    },
    [answers, confidence, revealedHints, eli5Enabled]
  );

  const calculateScore = useCallback(
    (resourceId: string, questions: any[]) => {
      let correct = 0;
      questions.forEach((q, i) => {
        const key = `${resourceId}_${i}`;
        const selected = answers[key];
        if (selected === undefined) return;

        const rawCorrect = q.correct_answer ?? q.answer ?? q.correct ?? null;
        let correctIdx: number | null = null;

        if (typeof rawCorrect === "number") {
          correctIdx = rawCorrect;
        } else if (typeof rawCorrect === "string") {
          const letter = rawCorrect.trim().toUpperCase();
          if (letter.length === 1 && letter >= "A" && letter <= "Z") {
            correctIdx = letter.charCodeAt(0) - 65;
          } else {
            const idx = q.options?.findIndex(
              (o: string) => o.toLowerCase().trim() === rawCorrect.toLowerCase().trim()
            );
            if (idx !== undefined && idx >= 0) correctIdx = idx;
          }
        }

        if (correctIdx !== null && selected === correctIdx) {
          correct++;
        }
      });
      return correct;
    },
    [answers]
  );

  return {
    answers,
    confidence,
    revealedHints,
    eli5Enabled,
    showDistractors,
    selectAnswer,
    setConfidenceLevel,
    revealHint,
    toggleEli5,
    toggleDistractor,
    resetQuiz,
    getQuestionState,
    calculateScore,
  };
}

// Helper to determine correct answer index
export function getCorrectAnswerIndex(question: any): number | null {
  const rawCorrect = question.correct_answer ?? question.answer ?? question.correct ?? null;
  
  if (typeof rawCorrect === "number") {
    return rawCorrect;
  }
  
  if (typeof rawCorrect === "string") {
    const letter = rawCorrect.trim().toUpperCase();
    if (letter.length === 1 && letter >= "A" && letter <= "Z") {
      return letter.charCodeAt(0) - 65;
    }
    const idx = question.options?.findIndex(
      (o: string) => o.toLowerCase().trim() === rawCorrect.toLowerCase().trim()
    );
    if (idx !== undefined && idx >= 0) return idx;
  }
  
  return null;
}
