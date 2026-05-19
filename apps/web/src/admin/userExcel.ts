import * as XLSX from 'xlsx';
import type { Role } from '../types';

export interface UserImportRow {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  className?: string;
}

const TEMPLATE_HEADERS = [
  'Họ tên',
  'Email',
  'Mật khẩu',
  'Vai trò',
  'Lớp',
] as const;

const SAMPLE_ROWS: string[][] = [
  ['Nguyễn Văn An', 'hs.moi@game.local', '123456', 'HS', '6A1'],
  ['Cô Lan', 'gv.moi@game.local', '123456', 'GV', ''],
];

function norm(s: unknown): string {
  return String(s ?? '')
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
}

function cell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

export function parseRole(raw: string): Role {
  const r = norm(raw).replace(/\s+/g, '_');
  if (['hs', 'hoc_sinh', 'student', 'học_sinh'].includes(r)) return 'STUDENT';
  if (['gv', 'giao_vien', 'teacher', 'giáo_viên'].includes(r)) return 'TEACHER';
  if (['admin', 'org_admin', 'quan_tri', 'quantri'].includes(r)) return 'ORG_ADMIN';
  if (['super', 'super_admin'].includes(r)) return 'SUPER_ADMIN';
  if (['STUDENT', 'TEACHER', 'ORG_ADMIN', 'SUPER_ADMIN'].includes(raw.trim().toUpperCase())) {
    return raw.trim().toUpperCase() as Role;
  }
  throw new Error(`Vai trò «${raw}» không hợp lệ — dùng HS, GV, Admin hoặc STUDENT, TEACHER, ORG_ADMIN`);
}

export async function parseUserExcel(file: File): Promise<UserImportRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('File Excel không có sheet nào');

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });
  if (rows.length === 0) throw new Error('Sheet trống — thêm ít nhất một dòng người dùng');

  const out: UserImportRow[] = [];

  for (const raw of rows) {
    const mapped: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      mapped[norm(k)] = v;
    }

    const fullName = cell(mapped, 'ho ten', 'hoten', 'fullname', 'ten');
    const email = cell(mapped, 'email', 'mail');
    const password = cell(mapped, 'mat khau', 'password', 'mk');
    const roleRaw = cell(mapped, 'vai tro', 'role');
    const className = cell(mapped, 'lop', 'class', 'ten lop') || undefined;

    if (!fullName && !email) continue;

    if (!fullName || !email || !password || !roleRaw) {
      throw new Error(
        `Dòng thiếu dữ liệu (${email || fullName || 'trống'}): cần đủ Họ tên, Email, Mật khẩu, Vai trò`,
      );
    }
    if (password.length < 6) {
      throw new Error(`Email ${email}: mật khẩu tối thiểu 6 ký tự`);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`Email không hợp lệ: ${email}`);
    }

    const role = parseRole(roleRaw);
    out.push({
      fullName,
      email: email.toLowerCase(),
      password,
      role,
      className,
    });
  }

  if (out.length === 0) {
    throw new Error('Không có dòng hợp lệ. Tải file mẫu và kiểm tra tiêu đề cột.');
  }

  return out;
}

export function downloadUserTemplate(): void {
  const ws = XLSX.utils.aoa_to_sheet([[...TEMPLATE_HEADERS], ...SAMPLE_ROWS]);
  ws['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Nguoi dung');
  XLSX.writeFile(wb, 'mau-nguoi-dung.xlsx');
}
