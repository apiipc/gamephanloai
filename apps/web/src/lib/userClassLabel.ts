/** Nhãn lớp: HS = lớp học; GV = các lớp phụ trách GVCN. */
export function userClassLabel(user: {
  role: string;
  class?: { name: string } | null;
  homeroomClassNames?: string | null;
  teachingClasses?: { name: string }[];
}): string {
  if (user.homeroomClassNames) {
    return user.role === 'TEACHER'
      ? `${user.homeroomClassNames} (GVCN)`
      : user.homeroomClassNames;
  }
  if (user.role === 'TEACHER') {
    const names = user.teachingClasses?.map((c) => c.name) ?? [];
    return names.length ? `${names.join(', ')} (GVCN)` : '—';
  }
  return user.class?.name ?? '—';
}
