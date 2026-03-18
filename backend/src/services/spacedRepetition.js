function calculateNextReview(currentProgress, qualityInput) {
  const quality = Math.max(0, Math.min(5, Number(qualityInput ?? 3)));

  const prevRepetitions = currentProgress?.repetitions ?? 0;
  const prevInterval = currentProgress?.interval_days ?? 1;
  const prevEase = currentProgress?.ease_factor ?? 2.5;

  let repetitions = prevRepetitions;
  let intervalDays = prevInterval;
  let easeFactor = prevEase;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 3;
    } else {
      intervalDays = Math.round(prevInterval * easeFactor);
    }
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + intervalDays);

  return {
    repetitions,
    interval_days: intervalDays,
    ease_factor: Number(easeFactor.toFixed(2)),
    due_date: dueDate.toISOString(),
    last_quality: quality
  };
}

module.exports = {
  calculateNextReview
};
