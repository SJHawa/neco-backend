export function distributeContributionPercents(scores: number[]): number[] {
  const normalizedScores = scores.map((score) => Math.max(0, score));
  const total = normalizedScores.reduce((sum, score) => sum + score, 0);

  if (total === 0) {
    return normalizedScores.map(() => 0);
  }

  const exactPercents = normalizedScores.map((score) => (score / total) * 100);
  const roundedDown = exactPercents.map(Math.floor);
  let remainder = 100 - roundedDown.reduce((sum, percent) => sum + percent, 0);
  const remainderOrder = exactPercents
    .map((value, index) => ({
      index,
      fraction: value - Math.floor(value),
    }))
    .sort(
      (left, right) =>
        right.fraction - left.fraction || left.index - right.index,
    );

  for (const entry of remainderOrder) {
    if (remainder <= 0) {
      break;
    }
    roundedDown[entry.index] += 1;
    remainder -= 1;
  }

  return roundedDown;
}
