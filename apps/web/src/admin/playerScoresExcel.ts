import * as XLSX from 'xlsx';
import type { PlayerScoreRow } from '../components/AdminOverviewPanel';

const ROLE_EXPORT: Record<string, string> = {
  STUDENT: 'HS',
  TEACHER: 'GV',
  ORG_ADMIN: 'Admin',
  SUPER_ADMIN: 'Super',
};

const HEADERS = [
  'Họ tên',
  'Email',
  'Vai trò',
  'Lớp',
  'Phân loại (điểm)',
  'Phân loại (lượt)',
  'Quiz (điểm)',
  'Quiz (lượt)',
  'Vòng quay (điểm)',
  'Vòng quay (lần)',
  'Tổng 3 trò',
] as const;

function rowToCells(row: PlayerScoreRow): (string | number)[] {
  return [
    row.fullName,
    row.email,
    ROLE_EXPORT[row.role] ?? row.role,
    row.className ?? '',
    row.sortPoints,
    row.sortPlays,
    row.quizPoints,
    row.quizPlays,
    row.wheelPoints,
    row.wheelSpins,
    row.totalPoints,
  ];
}

/** Xuất bảng điểm từng người chơi ra file .xlsx */
export function downloadPlayerScoresExcel(rows: PlayerScoreRow[]): void {
  const data = rows.map(rowToCells);
  const ws = XLSX.utils.aoa_to_sheet([[...HEADERS], ...data]);
  ws['!cols'] = [
    { wch: 22 },
    { wch: 28 },
    { wch: 8 },
    { wch: 8 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bang diem');
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `bang-diem-nguoi-choi-${date}.xlsx`);
}
