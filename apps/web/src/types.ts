export type Role = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'TEACHER' | 'STUDENT';
export type TrashCategory = 'ORGANIC' | 'RECYCLE' | 'OTHER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  greenPoints: number;
  organizationId?: string | null;
  classId?: string | null;
  organization?: { id: string; name: string } | null;
  class?: { id: string; name: string } | null;
}

export interface TrashItem {
  id: string;
  name: string;
  emoji: string;
  imageUrl?: string | null;
  category: TrashCategory;
  active?: boolean;
}

export const BIN_IMAGES: Record<TrashCategory, string> = {
  ORGANIC: '/assets/bins/organic.png',
  RECYCLE: '/assets/bins/recycle.png',
  OTHER: '/assets/bins/other.png',
};

export interface GameSession {
  id: string;
  score: number;
  correctCount: number;
  totalCount: number;
  durationSec: number;
  startedAt: string;
  finishedAt?: string | null;
}

export type LeaderboardMode = 'green' | 'sort' | 'quiz' | 'wheel' | 'total';

export interface LeaderboardEntry {
  rank: number;
  id: string;
  fullName: string;
  score: number;
  greenPoints: number;
  sortPoints: number;
  quizPoints: number;
  wheelPoints: number;
  totalPoints: number;
}

export interface QuizConfig {
  secondsPerQuestion: number;
  questionsPerRound: number;
}

export interface QuizOption {
  key: string;
  text: string;
}

export interface QuizPlayQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  options: QuizOption[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation?: string | null;
  active: boolean;
}

export type WheelPrizeType = 'POINTS' | 'SPIN' | 'ITEM' | 'VOUCHER';
export type WheelMissionKey = 'SORT_CORRECT' | 'DAILY_LOGIN' | 'PLAY_SORT';

export interface WheelPrizeSegment {
  id: string;
  name: string;
  type: WheelPrizeType;
  value: number;
  color: string;
  icon?: string | null;
}

export interface WheelMissionState {
  id: string;
  title: string;
  description: string;
  missionKey: WheelMissionKey;
  targetCount: number;
  rewardSpins: number;
  current: number;
  done: boolean;
  claimed: boolean;
}

export interface WheelState {
  config: {
    dailyFreeSpins: number;
    bonusEverySpins: number;
    extraSpinsEnabled: boolean;
    maxExtraSpinsPerDay: number;
  };
  spinsRemaining: number;
  spinsUsedToday: number;
  spinsTowardBonus: number;
  bonusEverySpins: number;
  greenPoints: number;
  prizes: WheelPrizeSegment[];
  missions: WheelMissionState[];
}

export interface WheelSpinResult {
  prize: WheelPrizeSegment;
  spinsRemaining: number;
  spinsTowardBonus: number;
  bonusGranted: boolean;
  greenPoints: number;
}

export interface WheelHistoryEntry {
  id: string;
  prizeName: string;
  prizeType: WheelPrizeType;
  value: number;
  createdAt: string;
}

export interface WheelPrizeAdmin {
  id: string;
  name: string;
  type: WheelPrizeType;
  value: number;
  weight: number;
  color: string;
  icon?: string | null;
  active: boolean;
  sortOrder: number;
}

export interface WheelMissionAdmin {
  id: string;
  title: string;
  description: string;
  missionKey: WheelMissionKey;
  targetCount: number;
  rewardSpins: number;
  active: boolean;
  sortOrder: number;
}

export interface WheelConfigAdmin {
  id: string;
  dailyFreeSpins: number;
  resetHour: number;
  extraSpinsEnabled: boolean;
  maxExtraSpinsPerDay: number;
  bonusEverySpins: number;
}
