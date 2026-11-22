export interface RankingScoreBreakdownResponse {
  clear: number;
  firstAttempt: number;
  time: number;
  failure: number;
}

export interface IndividualRankingEntry {
  rank: number;
  userId: string;
  nickname: string;
  score: number;
  clearedSteps: number;
  failedAttempts: number;
  firstAttemptClears: number;
  averageClearSeconds: number | null;
  scoreBreakdown: RankingScoreBreakdownResponse;
}

export interface GameContributionEntry {
  rank: number;
  userId: string;
  nickname: string;
  score: number;
  contributionPercent: number;
  clearedSteps: number;
  failedAttempts: number;
  firstAttemptClears: number;
  averageClearSeconds: number | null;
  scoreBreakdown: RankingScoreBreakdownResponse;
}

export interface GameContributionSummary {
  gameRoomId: string;
  teamScore: number;
  teamName: string | null;
  rankingRegistered: boolean;
  canRegisterRanking: boolean;
  contributions: GameContributionEntry[];
}

export interface TeamRankingRegistrationResponse {
  gameRoomId: string;
  teamName: string;
  registeredAt: string;
}

export interface TeamRankingEntry {
  rank: number;
  gameRoomId: string;
  teamName: string;
  score: number;
  difficulty: string;
  missionCleared: boolean;
  remainingStrikes: number;
  participants: Array<{ userId: string; nickname: string }>;
}
