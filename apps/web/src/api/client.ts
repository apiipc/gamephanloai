/** Dev: Vite proxy `/api` → API local. Production (Railway, …): set `VITE_API_URL` (no trailing `/`). */
const rawBase = import.meta.env.VITE_API_URL || '/api';
const API_BASE =
  rawBase === '/api' ? rawBase : rawBase.replace(/\/+$/, '');

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function parseApiError(res: Response): Promise<string> {
  const text = await res.text();
  let message = res.statusText || 'Lỗi kết nối';
  try {
    const parsed = JSON.parse(text) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) message = parsed.message.join(', ');
    else if (parsed.message) message = parsed.message;
  } catch {
    if (text.trim()) message = text.trim();
  }
  return message;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json();
}

/** Upload multipart (không set Content-Type — browser tự gắn boundary) */
export async function apiForm<T>(
  path: string,
  formData: FormData,
  method: 'POST' | 'PATCH' = 'POST',
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json();
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ token: string; user: import('../types').User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => api<import('../types').User>('/auth/me'),
};

export const gameApi = {
  getItems: () => api<import('../types').TrashItem[]>('/game/items'),
  startSession: (durationSec = 45) =>
    api<import('../types').GameSession>('/game/sessions/start', {
      method: 'POST',
      body: JSON.stringify({ durationSec }),
    }),
  answer: (sessionId: string, itemId: string, binChosen: string) =>
    api<{
      isCorrect: boolean;
      pointsDelta: number;
      session: import('../types').GameSession;
    }>(`/game/sessions/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ itemId, binChosen }),
    }),
  finish: (sessionId: string) =>
    api<import('../types').GameSession & { bonus: number }>(
      `/game/sessions/${sessionId}/finish`,
      { method: 'POST' },
    ),
};

export const leaderboardApi = {
  classBoard: (classId?: string, mode?: import('../types').LeaderboardMode) => {
    const q = new URLSearchParams();
    if (classId) q.set('classId', classId);
    if (mode) q.set('mode', mode);
    const qs = q.toString();
    return api<import('../types').LeaderboardEntry[]>(
      `/leaderboard/class${qs ? `?${qs}` : ''}`,
    );
  },
  myRank: (mode?: import('../types').LeaderboardMode) => {
    const qs = mode ? `?mode=${mode}` : '';
    return api<import('../types').LeaderboardEntry | null>(`/leaderboard/my-rank${qs}`);
  },
  classes: () =>
    api<
      {
        rank: number;
        classId: string;
        className: string;
        totalPoints: number;
        studentCount: number;
      }[]
    >('/leaderboard/classes'),
};

export const quizApi = {
  getConfig: () => api<import('../types').QuizConfig>('/quiz/config'),
  start: () =>
    api<{
      sessionId: string;
      secondsPerQuestion: number;
      totalCount: number;
      questions: import('../types').QuizPlayQuestion[];
    }>('/quiz/sessions/start', { method: 'POST' }),
  answer: (sessionId: string, questionId: string, chosen: string) =>
    api<{
      isCorrect: boolean;
      pointsDelta: number;
      comboBonus?: number;
      currentStreak?: number;
      correctOption: string;
      explanation?: string | null;
      session: { score: number; correctCount: number; totalCount: number };
    }>(`/quiz/sessions/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ questionId, chosen }),
    }),
  finish: (sessionId: string) =>
    api<{
      score: number;
      correctCount: number;
      totalCount: number;
      maxCombo?: number;
      completionBonus?: number;
    }>(`/quiz/sessions/${sessionId}/finish`, { method: 'POST' }),
  adminConfig: () => api<import('../types').QuizConfig>('/quiz/admin/config'),
  updateConfig: (data: Partial<import('../types').QuizConfig>) =>
    api('/quiz/admin/config', { method: 'PATCH', body: JSON.stringify(data) }),
  adminQuestions: () => api<import('../types').QuizQuestion[]>('/quiz/admin/questions'),
  createQuestion: (data: object) =>
    api('/quiz/admin/questions', { method: 'POST', body: JSON.stringify(data) }),
  importQuestions: (items: object[]) =>
    api<{ created: number; total: number }>('/quiz/admin/questions/import', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  updateQuestion: (id: string, data: object) =>
    api(`/quiz/admin/questions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteQuestion: (id: string) =>
    api(`/quiz/admin/questions/${id}`, { method: 'DELETE' }),
};

export const wheelApi = {
  state: () => api<import('../types').WheelState>('/wheel/state'),
  spin: () => api<import('../types').WheelSpinResult>('/wheel/spin', { method: 'POST' }),
  claimMission: (id: string) =>
    api<{ rewardSpins: number; spinsRemaining: number }>(`/wheel/missions/${id}/claim`, {
      method: 'POST',
    }),
  history: (limit = 50) =>
    api<import('../types').WheelHistoryEntry[]>(`/wheel/history?limit=${limit}`),
  adminAll: () =>
    api<{
      config: import('../types').WheelConfigAdmin;
      prizes: import('../types').WheelPrizeAdmin[];
      missions: import('../types').WheelMissionAdmin[];
    }>('/wheel/admin'),
  adminUpdateConfig: (data: Partial<import('../types').WheelConfigAdmin>) =>
    api('/wheel/admin/config', { method: 'PATCH', body: JSON.stringify(data) }),
  adminCreatePrize: (data: object) =>
    api('/wheel/admin/prizes', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdatePrize: (id: string, data: object) =>
    api(`/wheel/admin/prizes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  adminDeletePrize: (id: string) =>
    api(`/wheel/admin/prizes/${id}`, { method: 'DELETE' }),
  adminCreateMission: (data: object) =>
    api('/wheel/admin/missions', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateMission: (id: string, data: object) =>
    api(`/wheel/admin/missions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  adminDeleteMission: (id: string) =>
    api(`/wheel/admin/missions/${id}`, { method: 'DELETE' }),
};

export const adminApi = {
  dashboard: () =>
    api<{
      userCount: number;
      sessionCount: number;
      classCount: number;
      recentSessions: unknown[];
    }>('/admin/dashboard'),
  users: () => api<unknown[]>('/admin/users'),
  classes: () => api<unknown[]>('/admin/classes'),
  trashItems: () => api<unknown[]>('/admin/trash-items'),
  createUser: (data: object) =>
    api('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  importUsers: (users: object[]) =>
    api<{
      created: number;
      failed: number;
      total: number;
      errors: { row: number; email: string; message: string }[];
    }>('/admin/users/import', {
      method: 'POST',
      body: JSON.stringify({ users }),
    }),
  createTrash: (formData: FormData) =>
    apiForm<import('../types').TrashItem>('/admin/trash-items', formData),
  syncTrashManifest: () =>
    api<{
      created: number;
      updated: number;
      skipped: number;
      total: number;
      inDb: number;
    }>('/admin/trash-items/sync-manifest', { method: 'POST' }),
  updateTrash: (id: string, data: Partial<import('../types').TrashItem>) =>
    api<import('../types').TrashItem>(`/admin/trash-items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  updateTrashWithImage: (id: string, formData: FormData) =>
    apiForm<import('../types').TrashItem>(`/admin/trash-items/${id}`, formData, 'PATCH'),
  deleteTrash: (id: string) =>
    api<{ ok: boolean; deactivated?: boolean; message?: string }>(
      `/admin/trash-items/${id}`,
      { method: 'DELETE' },
    ),
  auditLogs: () => api<unknown[]>('/admin/audit-logs'),
};
