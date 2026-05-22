import * as XLSX from 'xlsx';
import { DEFAULT_USER_PASSWORD } from '../lib/defaultPassword';
import type { Role } from '../types';

export interface UserImportRow {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  className?: string;
}

export interface UserExcelParseResult {
  rows: UserImportRow[];
  skipped: { row: number; reason: string }[];
}

const TEMPLATE_HEADERS = [
  'Họ tên',
  'Email',
  'Mật khẩu',
  'Vai trò',
  'Lớp',
] as const;

const SAMPLE_ROWS: string[][] = [
  ['Nguyễn Văn An', 'hs.an@truong.edu.vn', '123456', 'HS', '12A1'],
  ['Cô Lan', 'gv.lan@truong.edu.vn', '123456', 'GV', ''],
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

/** Mật khẩu từ Excel (ô số thường mất số 0 đầu — ép chuỗi). */
function passwordCell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (v == null || v === '') continue;
    if (typeof v === 'number' && Number.isFinite(v)) {
      return String(Math.trunc(v));
    }
    return String(v).trim();
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
  throw new Error(`Vai trò «${raw}» không hợp lệ — dùng HS, GV, Admin`);
}

export async function parseUserExcel(file: File): Promise<UserExcelParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('File Excel không có sheet nào');

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: true,
  });
  if (rows.length === 0) throw new Error('Sheet trống — thêm ít nhất một dòng người dùng');

  const out: UserImportRow[] = [];
  const skipped: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = i + 2;
    const mapped: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      mapped[norm(k)] = v;
    }

    const fullName = cell(mapped, 'ho ten', 'hoten', 'fullname', 'ten');
    const email = cell(mapped, 'email', 'mail');
    let password = passwordCell(mapped, 'mat khau', 'password', 'mk');
    const roleRaw = cell(mapped, 'vai tro', 'role');
    const className = cell(mapped, 'lop', 'class', 'ten lop') || undefined;

    if (!fullName && !email) continue;

    try {
      if (!fullName || !email || !roleRaw) {
        throw new Error('Thiếu Họ tên, Email hoặc Vai trò');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Email không hợp lệ');
      }
      if (!password || password.length < 6) {
        password = DEFAULT_USER_PASSWORD;
      }

      const role = parseRole(roleRaw);
      if (role === 'STUDENT' && !className?.trim()) {
        throw new Error('Học sinh cần cột Lớp');
      }

      out.push({
        fullName,
        email: email.toLowerCase(),
        password,
        role,
        className: className?.trim() || undefined,
      });
    } catch (e) {
      skipped.push({
        row: rowNum,
        reason: e instanceof Error ? e.message : 'Dòng không hợp lệ',
      });
    }
  }

  if (out.length === 0) {
    const hint = skipped.length
      ? ` ${skipped.length} dòng lỗi (vd. dòng ${skipped[0].row}: ${skipped[0].reason}).`
      : '';
    throw new Error(`Không có dòng hợp lệ.${hint}`);
  }

  return { rows: out, skipped };
}

export function downloadUserTemplate(): void {
  const ws = XLSX.utils.aoa_to_sheet([[...TEMPLATE_HEADERS], ...SAMPLE_ROWS]);
  ws['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Nguoi dung');
  XLSX.writeFile(wb, 'mau-nguoi-dung.xlsx');
}
