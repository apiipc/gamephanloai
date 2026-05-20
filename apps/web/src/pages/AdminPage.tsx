import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, quizApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { QuizConfig, QuizQuestion, Role, TrashCategory } from '../types';
import { QuizRulesPanel } from '../quiz/QuizRulesPanel';
import { QuizExcelUpload } from '../quiz/QuizExcelUpload';
import { QuizQuestionBank } from '../quiz/QuizQuestionBank';
import { TrashCatalog } from '../components/TrashCatalog';
import { WheelAdminPanel } from '../components/WheelAdminPanel';
import { UserAdminPanel } from '../components/UserAdminPanel';
import { AdminOverviewPanel } from '../components/AdminOverviewPanel';
import type { PlayerScoreRow } from '../components/AdminOverviewPanel';

interface Dashboard {
  userCount: number;
  sessionCount: number;
  classCount: number;
  games?: {
    sort: { name: string; icon: string; plays: number; totalPoints: number };
    quiz: { name: string; icon: string; plays: number; totalPoints: number };
    wheel: { name: string; icon: string; plays: number; totalPoints: number };
  };
  playerScores?: PlayerScoreRow[];
}

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  greenPoints: number;
  class?: { name: string } | null;
}

interface TrashRow {
  id: string;
  name: string;
  emoji: string;
  imageUrl?: string | null;
  category: TrashCategory;
  active: boolean;
}

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [trash, setTrash] = useState<TrashRow[]>([]);
  const [tab, setTab] = useState<'overview' | 'users' | 'trash' | 'quiz' | 'wheel'>('overview');
  const [msg, setMsg] = useState('');
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState('');
  const [trashImage, setTrashImage] = useState<File | null>(null);
  const [trashImagePreview, setTrashImagePreview] = useState<string | null>(null);
  const [trashSyncing, setTrashSyncing] = useState(false);

  const canManageTrash = user?.role === 'ORG_ADMIN' || user?.role === 'SUPER_ADMIN';
  const canManageQuiz =
    user?.role === 'TEACHER' || user?.role === 'ORG_ADMIN' || user?.role === 'SUPER_ADMIN';
  const canManageWheel = user?.role === 'ORG_ADMIN' || user?.role === 'SUPER_ADMIN';
  const canCreateUser = user?.role !== 'STUDENT';

  const load = async () => {
    const [d, u] = await Promise.all([
      adminApi.dashboard() as Promise<Dashboard>,
      adminApi.users() as Promise<AdminUser[]>,
    ]);
    setDash(d);
    setUsers(u);
    if (canManageTrash) {
      const t = (await adminApi.trashItems()) as TrashRow[];
      setTrash(t);
    }
  };

  const loadQuiz = async () => {
    setQuizLoading(true);
    setQuizError('');
    try {
      const [cfg, qs] = await Promise.all([
        quizApi.adminConfig() as Promise<QuizConfig>,
        quizApi.adminQuestions() as Promise<QuizQuestion[]>,
      ]);
      setQuizConfig(cfg);
      setQuizQuestions(qs);
    } catch (e) {
      setQuizConfig(null);
      setQuizQuestions([]);
      setQuizError(e instanceof Error ? e.message : 'Không tải được quiz');
    } finally {
      setQuizLoading(false);
    }
  };

  useEffect(() => {
    load().catch(console.error);
  }, [canManageTrash]);

  useEffect(() => {
    if (tab === 'quiz' && canManageQuiz) {
      loadQuiz().catch(console.error);
    }
  }, [tab, canManageQuiz]);

  const handleCreateTrash = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!trashImage) {
      setMsg('Vui lòng chọn ảnh vật phẩm');
      return;
    }
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set('image', trashImage);
    await adminApi.createTrash(fd);
    setMsg('Đã thêm món rác');
    form.reset();
    setTrashImage(null);
    if (trashImagePreview) URL.revokeObjectURL(trashImagePreview);
    setTrashImagePreview(null);
    load();
  };

  const onTrashImagePick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMsg('Chỉ chấp nhận file ảnh');
      return;
    }
    setTrashImage(file);
    if (trashImagePreview) URL.revokeObjectURL(trashImagePreview);
    setTrashImagePreview(URL.createObjectURL(file));
  };

  const roleBadge = (role: Role) => {
    const cls =
      role === 'STUDENT'
        ? 'badge-student'
        : role === 'TEACHER'
          ? 'badge-teacher'
          : 'badge-admin';
    const labels: Record<Role, string> = {
      STUDENT: 'HS',
      TEACHER: 'GV',
      ORG_ADMIN: 'Admin',
      SUPER_ADMIN: 'Super',
    };
    return <span className={`badge ${cls}`}>{labels[role]}</span>;
  };

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div>
          <h1 style={{ color: 'var(--green-700)' }}>⚙️ Quản trị</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>{user?.fullName}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/" className="btn btn-secondary">
            App
          </Link>
          <button className="btn btn-secondary" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </header>

      {msg && (
        <p style={{ background: 'var(--green-50)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {msg}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['overview', 'users', 'trash', 'quiz', 'wheel'] as const).map((t) => (
          <button
            key={t}
            className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t)}
            disabled={
              (t === 'trash' && !canManageTrash) ||
              (t === 'quiz' && !canManageQuiz) ||
              (t === 'wheel' && !canManageWheel)
            }
          >
            {t === 'overview'
              ? 'Tổng quan'
              : t === 'users'
                ? 'Người dùng'
                : t === 'trash'
                  ? 'Danh mục rác'
                  : t === 'quiz'
                    ? 'Quiz'
                    : 'Vòng quay'}
          </button>
        ))}
      </div>

      {tab === 'overview' && dash && dash.games && dash.playerScores && (
        <AdminOverviewPanel
          userCount={dash.userCount}
          classCount={dash.classCount}
          sessionCount={dash.sessionCount}
          games={dash.games}
          playerScores={dash.playerScores}
        />
      )}

      {tab === 'overview' && dash && !dash.games && (
        <p style={{ color: 'var(--gray-500)' }}>
          Đang tải thống kê điểm… Hãy restart API và tải lại trang.
        </p>
      )}


      {tab === 'users' && (
        <>
          {canCreateUser && user && (
            <UserAdminPanel
              users={users}
              actorRole={user.role}
              onMessage={setMsg}
              onChanged={load}
            />
          )}
          <div className="user-admin__table-wrap card" style={{ marginTop: 16 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>Danh sách người dùng</h3>
            <table className="wheel-admin__table">
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Lớp</th>
                  <th>Điểm</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.fullName}</td>
                    <td>{u.email}</td>
                    <td>{roleBadge(u.role)}</td>
                    <td>{u.class?.name ?? '—'}</td>
                    <td>{u.greenPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'trash' && canManageTrash && (
        <>
          <div className="trash-sync-bar" style={{ justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={trashSyncing}
              onClick={async () => {
                setTrashSyncing(true);
                try {
                  const res = await adminApi.syncTrashManifest();
                  setMsg(
                    `Đồng bộ xong: ${res.created} mới, ${res.updated} cập nhật — tổng ${res.inDb} trong DB`,
                  );
                  load();
                } catch (e) {
                  setMsg(e instanceof Error ? e.message : 'Lỗi đồng bộ');
                } finally {
                  setTrashSyncing(false);
                }
              }}
            >
              {trashSyncing ? 'Đang đồng bộ…' : '🔄 Đồng bộ danh mục ảnh'}
            </button>
          </div>

          <form className="trash-add-form" onSubmit={handleCreateTrash}>
            <div className="form-group trash-add-form__name">
              <label>Tên rác</label>
              <input name="name" required placeholder="Vỏ cam" />
            </div>
            <div className="form-group trash-add-form__image">
              <label>Ảnh vật phẩm</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                required
                onChange={(e) => {
                  onTrashImagePick(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              {trashImagePreview && (
                <img
                  src={trashImagePreview}
                  alt=""
                  className="trash-add-form__preview"
                />
              )}
            </div>
            <div className="form-group trash-add-form__type">
              <label>Loại</label>
              <select name="category" required>
                <option value="ORGANIC">Hữu cơ</option>
                <option value="RECYCLE">Tái chế</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary trash-add-form__submit">
              Thêm
            </button>
          </form>
          <TrashCatalog items={trash} onChanged={load} onMessage={setMsg} />
        </>
      )}

      {tab === 'quiz' && canManageQuiz && quizLoading && (
        <p style={{ color: 'var(--gray-500)' }}>Đang tải quiz…</p>
      )}

      {tab === 'quiz' && canManageQuiz && quizError && !quizLoading && (
        <div className="card" style={{ marginBottom: 16, borderColor: '#fecaca' }}>
          <p style={{ color: '#b91c1c', marginBottom: 8 }}>{quizError}</p>
          <button type="button" className="btn btn-secondary" onClick={() => loadQuiz()}>
            Thử lại
          </button>
        </div>
      )}

      {tab === 'quiz' && canManageQuiz && quizConfig && !quizLoading && (
        <>
          <div style={{ marginBottom: 20 }}>
            <QuizRulesPanel compact />
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12 }}>Cài đặt Quiz môi trường</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                await quizApi.updateConfig({
                  secondsPerQuestion: Number(fd.get('seconds')),
                  questionsPerRound: Number(fd.get('count')),
                });
                setMsg('Đã lưu cài đặt quiz');
                loadQuiz();
              }}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr auto',
                gap: 12,
                alignItems: 'end',
              }}
            >
              <div className="form-group" style={{ margin: 0 }}>
                <label>Giây mỗi câu</label>
                <input
                  name="seconds"
                  type="number"
                  min={5}
                  max={120}
                  defaultValue={quizConfig.secondsPerQuestion}
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Số câu mỗi lần chơi</label>
                <input
                  name="count"
                  type="number"
                  min={1}
                  max={50}
                  defaultValue={quizConfig.questionsPerRound}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Lưu
              </button>
            </form>
            <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 8 }}>
              Hệ thống tự trộn ngẫu nhiên và lấy đủ số câu từ ngân hàng câu hỏi.
            </p>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12 }}>Thêm câu hỏi</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                await quizApi.createQuestion({
                  question: fd.get('question'),
                  optionA: fd.get('optionA'),
                  optionB: fd.get('optionB'),
                  optionC: fd.get('optionC'),
                  optionD: fd.get('optionD'),
                  correctOption: fd.get('correct'),
                });
                setMsg('Đã thêm câu hỏi');
                (e.target as HTMLFormElement).reset();
                loadQuiz();
              }}
              style={{ display: 'grid', gap: 8 }}
            >
              <input name="question" required placeholder="Câu hỏi?" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input name="optionA" required placeholder="A" />
                <input name="optionB" required placeholder="B" />
                <input name="optionC" required placeholder="C" />
                <input name="optionD" required placeholder="D" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select name="correct" required style={{ flex: 1 }}>
                  <option value="A">Đáp án A</option>
                  <option value="B">Đáp án B</option>
                  <option value="C">Đáp án C</option>
                  <option value="D">Đáp án D</option>
                </select>
                <button type="submit" className="btn btn-primary">
                  Thêm
                </button>
              </div>
            </form>
          </div>

          <QuizExcelUpload
            onImport={(items) => quizApi.importQuestions(items)}
            onMessage={(text) => {
              setMsg(text);
              loadQuiz();
            }}
          />

          <QuizQuestionBank
            questions={quizQuestions}
            onChanged={loadQuiz}
            onMessage={setMsg}
          />
        </>
      )}

      {tab === 'wheel' && canManageWheel && (
        <WheelAdminPanel onMessage={setMsg} />
      )}
    </div>
  );
}
