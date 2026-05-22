import { useEffect, useState } from 'react';
import { leaderboardApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export interface ManagedClassStat {
  rank: number;
  classId: string;
  className: string;
  studentCount: number;
  sortPoints: number;
  quizPoints: number;
  wheelPoints: number;
  totalPoints: number;
}

/** Tổng điểm 3 trò theo từng lớp GVCN quản lý. */
export function useTeacherClassStats() {
  const { isTeacher } = useAuth();
  const [classes, setClasses] = useState<ManagedClassStat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isTeacher) {
      setClasses([]);
      return;
    }
    setLoading(true);
    leaderboardApi
      .managedClasses()
      .then((rows) => setClasses(rows as ManagedClassStat[]))
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, [isTeacher]);

  return { classes, loading };
}
