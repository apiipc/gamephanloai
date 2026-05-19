import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { wheelApi } from '../api/client';
import type {
  WheelConfigAdmin,
  WheelMissionAdmin,
  WheelMissionKey,
  WheelPrizeAdmin,
  WheelPrizeType,
} from '../types';
import { WHEEL_MISSION_KEY_LABEL, WHEEL_PRIZE_LABEL } from '../wheel/constants';
import { WheelRulesPanel } from '../wheel/WheelRulesPanel';

function Field({
  label,
  hint,
  children,
  wide,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`wheel-admin__field ${wide ? 'wheel-admin__field--wide' : ''}`}>
      <span className="wheel-admin__field-label">{label}</span>
      {hint && <span className="wheel-admin__field-hint">{hint}</span>}
      {children}
    </label>
  );
}

const totalWeight = (prizes: WheelPrizeAdmin[]) =>
  prizes.reduce((s, p) => s + p.weight, 0);

export function WheelAdminPanel({ onMessage }: { onMessage: (msg: string) => void }) {
  const [config, setConfig] = useState<WheelConfigAdmin | null>(null);
  const [prizes, setPrizes] = useState<WheelPrizeAdmin[]>([]);
  const [missions, setMissions] = useState<WheelMissionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'config' | 'prize' | 'mission' | null>(null);
  const [prizeColor, setPrizeColor] = useState('#10b981');

  const load = async () => {
    setLoading(true);
    try {
      const data = await wheelApi.adminAll();
      setConfig(data.config);
      setPrizes(data.prizes);
      setMissions(data.missions);
    } catch (e) {
      onMessage(e instanceof Error ? e.message : 'Không tải vòng quay');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveConfig = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving('config');
    try {
      const fd = new FormData(e.currentTarget);
      await wheelApi.adminUpdateConfig({
        dailyFreeSpins: Number(fd.get('dailyFreeSpins')),
        resetHour: Number(fd.get('resetHour')),
        bonusEverySpins: Number(fd.get('bonusEverySpins')),
        maxExtraSpinsPerDay: Number(fd.get('maxExtraSpinsPerDay')),
        extraSpinsEnabled: fd.get('extraSpinsEnabled') === 'on',
      });
      onMessage('Đã lưu cấu hình vòng quay');
      await load();
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Lỗi lưu cấu hình');
    } finally {
      setSaving(null);
    }
  };

  const addPrize = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get('name') ?? '').trim();
    if (!name) {
      onMessage('Vui lòng nhập tên hiển thị trên vòng quay');
      return;
    }
    setSaving('prize');
    try {
      await wheelApi.adminCreatePrize({
        name,
        type: fd.get('type') as WheelPrizeType,
        value: Number(fd.get('value')),
        weight: Number(fd.get('weight')),
        color: String(fd.get('color') || '#10b981'),
        icon: String(fd.get('icon') || '🎁'),
      });
      form.reset();
      setPrizeColor('#10b981');
      onMessage('Đã thêm giải thưởng — học sinh sẽ thấy trên vòng quay');
      await load();
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Không thêm được giải thưởng');
    } finally {
      setSaving(null);
    }
  };

  const addMission = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get('title') ?? '').trim();
    const description = String(fd.get('description') ?? '').trim();
    if (!title || !description) {
      onMessage('Vui lòng nhập tên và mô tả nhiệm vụ');
      return;
    }
    setSaving('mission');
    try {
      await wheelApi.adminCreateMission({
        title,
        description,
        missionKey: fd.get('missionKey') as WheelMissionKey,
        targetCount: Number(fd.get('targetCount')),
        rewardSpins: Number(fd.get('rewardSpins')),
      });
      form.reset();
      onMessage('Đã thêm nhiệm vụ hằng ngày');
      await load();
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Không thêm được nhiệm vụ');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <p style={{ color: 'var(--gray-500)' }}>Đang tải Vòng quay xanh…</p>;

  const weightSum = totalWeight(prizes);

  return (
    <div className="wheel-admin">
      <p className="wheel-admin__intro">
        Quản lý <strong>Vòng Quay Xanh</strong>: mỗi dòng giải thưởng = một ô màu trên vòng. Tỷ lệ càng
        cao thì học sinh càng dễ trúng ô đó.
      </p>

      <WheelRulesPanel compact />

      {config && (
        <form className="card wheel-admin__block" onSubmit={saveConfig}>
          <h3 className="wheel-admin__block-title">⚙️ Cấu hình lượt quay</h3>
          <p className="wheel-admin__block-desc">
            Số lần học sinh được quay miễn phí mỗi ngày và quy tắc nhận thêm lượt.
          </p>
          <div className="wheel-admin__form-grid">
            <Field label="Lượt quay miễn phí / ngày" hint="Mỗi học sinh nhận khi bắt đầu ngày mới">
              <input name="dailyFreeSpins" type="number" min={0} defaultValue={config.dailyFreeSpins} />
            </Field>
            <Field label="Giờ reset trong ngày" hint="0 = 00:00, 23 = 23:00">
              <input name="resetHour" type="number" min={0} max={23} defaultValue={config.resetHour} />
            </Field>
            <Field
              label="Quay bao nhiêu lần → thưởng thêm 1 lượt"
              hint="VD: 3 = quay 3 lần được +1 lượt (thanh tiến độ trong game)"
            >
              <input name="bonusEverySpins" type="number" min={1} defaultValue={config.bonusEverySpins} />
            </Field>
            <Field label="Tối đa lượt thưởng từ nhiệm vụ / ngày" hint="Giới hạn lượt cộng từ nhiệm vụ">
              <input
                name="maxExtraSpinsPerDay"
                type="number"
                min={0}
                defaultValue={config.maxExtraSpinsPerDay}
              />
            </Field>
          </div>
          <label className="wheel-admin__check">
            <input type="checkbox" name="extraSpinsEnabled" defaultChecked={config.extraSpinsEnabled} />
            Cho phép học sinh nhận thêm lượt quay khi hoàn thành nhiệm vụ
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving === 'config'}>
            {saving === 'config' ? 'Đang lưu…' : 'Lưu cấu hình'}
          </button>
        </form>
      )}

      <section className="card wheel-admin__block">
        <h3 className="wheel-admin__block-title">🎁 Giải thưởng trên vòng ({prizes.length} ô)</h3>
        <p className="wheel-admin__block-desc">
          Danh sách các ô trên vòng quay. <strong>Tỷ lệ</strong> là trọng số (số càng lớn càng dễ
          trúng). Tổng trọng số hiện tại: <strong>{weightSum}</strong> — mỗi giải có % ước lượng ở
          cột bên phải.
        </p>

        <div className="wheel-admin__table-wrap">
          <table className="wheel-admin__table">
            <thead>
              <tr>
                <th>Màu ô</th>
                <th>Hiển thị trên vòng</th>
                <th>Loại quà</th>
                <th>Giá trị</th>
                <th>Tỷ lệ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {prizes.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span
                      className="wheel-admin__swatch"
                      style={{ background: p.color }}
                      title={p.color}
                    />
                  </td>
                  <td>
                    <span className="wheel-admin__prize-name">
                      {p.icon} {p.name}
                    </span>
                  </td>
                  <td>{WHEEL_PRIZE_LABEL[p.type] ?? p.type}</td>
                  <td>
                    {p.type === 'POINTS' && `${p.value} điểm`}
                    {p.type === 'SPIN' && `+${p.value} lượt`}
                    {p.type === 'ITEM' && 'Quà vật phẩm'}
                    {p.type === 'VOUCHER' && `Voucher ${p.value}%`}
                  </td>
                  <td>
                    <strong>{p.weight}</strong>
                    {weightSum > 0 && (
                      <span className="wheel-admin__pct-inline">
                        {' '}
                        (~{Math.round((p.weight / weightSum) * 100)}%)
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary wheel-admin__btn-sm"
                      onClick={async () => {
                        if (!confirm(`Xóa giải «${p.name}» khỏi vòng quay?`)) return;
                        try {
                          await wheelApi.adminDeletePrize(p.id);
                          onMessage('Đã xóa giải');
                          await load();
                        } catch (err) {
                          onMessage(err instanceof Error ? err.message : 'Không xóa được');
                        }
                      }}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="wheel-admin__add-box">
          <h4 className="wheel-admin__add-title">➕ Thêm giải thưởng mới</h4>
          <form className="wheel-admin__form-grid" onSubmit={addPrize}>
            <Field label="Tên hiển thị trên vòng *" hint="VD: +10 điểm, Túi vải, +1 lượt quay" wide>
              <input name="name" placeholder="Nhập tên học sinh sẽ thấy" required />
            </Field>
            <Field label="Loại quà" hint="Quyết định cách trao thưởng khi trúng">
              <select name="type" defaultValue="POINTS">
                <option value="POINTS">Điểm xanh ⭐</option>
                <option value="SPIN">Thêm lượt quay</option>
                <option value="ITEM">Vật phẩm (túi, bình nước…)</option>
                <option value="VOUCHER">Voucher / mã giảm giá</option>
              </select>
            </Field>
            <Field label="Giá trị" hint="Điểm: số điểm cộng · Lượt quay: số lượt · Voucher: % giảm">
              <input name="value" type="number" defaultValue={10} min={0} />
            </Field>
            <Field label="Tỷ lệ trúng (trọng số)" hint="Số càng lớn = càng dễ trúng. VD: 20 dễ hơn 5">
              <input name="weight" type="number" defaultValue={10} min={1} required />
            </Field>
            <Field label="Màu ô trên vòng" hint="Chọn màu phân biệt với các ô khác">
              <input
                type="color"
                name="color"
                className="wheel-admin__color-picker"
                value={prizeColor}
                onChange={(e) => setPrizeColor(e.target.value)}
                aria-label="Chọn màu ô trên vòng"
              />
            </Field>
            <Field label="Biểu tượng (emoji)" hint="Hiện cạnh tên trên vòng">
              <input name="icon" defaultValue="⭐" maxLength={4} placeholder="⭐" />
            </Field>
            <div className="wheel-admin__form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving === 'prize'}>
                {saving === 'prize' ? 'Đang thêm…' : 'Thêm vào vòng quay'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="card wheel-admin__block">
        <h3 className="wheel-admin__block-title">🎯 Nhiệm vụ hằng ngày ({missions.length})</h3>
        <p className="wheel-admin__block-desc">
          Học sinh làm xong nhiệm vụ → nhấn <strong>Nhận lượt quay</strong> trong game để được thêm lượt
          (không tự cộng).
        </p>

        <ul className="wheel-admin__mission-list">
          {missions.map((m) => (
            <li key={m.id} className="wheel-admin__mission-card">
              <div>
                <strong>{m.title}</strong>
                <p className="wheel-admin__mission-desc">{m.description}</p>
                <p className="wheel-admin__mission-meta">
                  Điều kiện: {WHEEL_MISSION_KEY_LABEL[m.missionKey] ?? m.missionKey} · Làm{' '}
                  <strong>{m.targetCount}</strong> lần → thưởng <strong>+{m.rewardSpins}</strong> lượt
                  quay
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary wheel-admin__btn-sm"
                onClick={async () => {
                  if (!confirm(`Xóa nhiệm vụ «${m.title}»?`)) return;
                  try {
                    await wheelApi.adminDeleteMission(m.id);
                    onMessage('Đã xóa nhiệm vụ');
                    await load();
                  } catch (err) {
                    onMessage(err instanceof Error ? err.message : 'Không xóa được');
                  }
                }}
              >
                Xóa
              </button>
            </li>
          ))}
        </ul>

        <div className="wheel-admin__add-box">
          <h4 className="wheel-admin__add-title">➕ Thêm nhiệm vụ mới</h4>
          <form className="wheel-admin__form-grid" onSubmit={addMission}>
            <Field label="Tên nhiệm vụ *" hint="Tiêu đề ngắn trong danh sách nhiệm vụ" wide>
              <input name="title" placeholder="VD: Chơi game phân loại" required />
            </Field>
            <Field label="Mô tả cho học sinh *" hint="Giải thích cần làm gì" wide>
              <input name="description" placeholder="VD: Hoàn thành 3 vòng trong ngày" required />
            </Field>
            <Field label="Điều kiện theo dõi" hint="Hệ thống tự đếm tiến độ theo loại này">
              <select name="missionKey" defaultValue="PLAY_SORT">
                <option value="SORT_CORRECT">{WHEEL_MISSION_KEY_LABEL.SORT_CORRECT}</option>
                <option value="DAILY_LOGIN">{WHEEL_MISSION_KEY_LABEL.DAILY_LOGIN}</option>
                <option value="PLAY_SORT">{WHEEL_MISSION_KEY_LABEL.PLAY_SORT}</option>
              </select>
            </Field>
            <Field label="Mục tiêu (số lần)" hint="VD: 3 = phải hoàn thành 3 lần mới đủ">
              <input name="targetCount" type="number" min={1} defaultValue={1} required />
            </Field>
            <Field label="Thưởng (lượt quay)" hint="Số lượt quay cộng thêm khi học sinh nhận thưởng">
              <input name="rewardSpins" type="number" min={1} defaultValue={1} required />
            </Field>
            <div className="wheel-admin__form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving === 'mission'}>
                {saving === 'mission' ? 'Đang thêm…' : 'Thêm nhiệm vụ'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <p className="wheel-admin__footer">
        Tham chiếu thiết kế:{' '}
        <a href="/assets/wheel-spec.png" target="_blank" rel="noreferrer">
          Bản mô tả Vòng quay xanh
        </a>
      </p>
    </div>
  );
}
