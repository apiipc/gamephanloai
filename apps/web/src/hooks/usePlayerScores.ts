import { useEffect, useState } from 'react';
import { leaderboardApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export interface PlayerScores {
  sortPoints: number;
  quizPoints: number;
  wheelPoints: number;
  totalPoints: number;
  greenPoints: number;
}

/** Điểm theo từng trò + tổng 3 game (khác trường greenPoints trên tài khoản). */
export function usePlayerScores() {
  const { user } = useAuth();
  const [scores, setScores] = useState<PlayerScores | null>(null);

  useEffect(() => {
    if (!user?.classId) {
      setScores(
        user
          ? {
              sortPoints: 0,
              quizPoints: 0,
              wheelPoints: 0,
              totalPoints: user.greenPoints ?? 0,
              greenPoints: user.greenPoints ?? 0,
            }
          : null,
      );
      return;
    }

    leaderboardApi
      .classBoard()
      .then((rows) => {
        const me = rows.find((r) => r.id === user.id);
        if (!me) {
          setScores({
            sortPoints: 0,
            quizPoints: 0,
            wheelPoints: 0,
            totalPoints: 0,
            greenPoints: user.greenPoints ?? 0,
          });
          return;
        }
        setScores({
          sortPoints: me.sortPoints,
          quizPoints: me.quizPoints,
          wheelPoints: me.wheelPoints,
          totalPoints: me.totalPoints,
          greenPoints: me.greenPoints,
        });
      })
      .catch(() => setScores(null));
  }, [user?.id, user?.classId, user?.greenPoints]);

  return scores;
}
