import { FormEvent, useState } from 'react';
import { adminApi } from '../api/client';
import type { TrashCategory } from '../types';

export interface TrashCatalogItem {
  id: string;
  name: string;
  emoji: string;
  imageUrl?: string | null;
  category: TrashCategory;
  active: boolean;
  isGlobal?: boolean;
}

const CATEGORY_LABEL: Record<TrashCategory, string> = {
  ORGANIC: 'Hữu cơ',
  RECYCLE: 'Tái chế',
  OTHER: 'Khác',
};

const CATEGORY_ORDER: TrashCategory[] = ['ORGANIC', 'RECYCLE', 'OTHER'];

interface TrashCatalogProps {
  items: TrashCatalogItem[];
  onChanged: () => void;
  onMessage: (msg: string) => void;
}

export function TrashCatalog({ items, onChanged, onMessage }: TrashCatalogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleQuickMove = async (item: TrashCatalogItem, category: TrashCategory) => {
    if (item.category === category) return;
    setBusyId(item.id);
    try {
      await adminApi.updateTrash(item.id, { category });
      onMessage(`Đã chuyển «${item.name}» sang ${CATEGORY_LABEL[category]}`);
      onChanged();
    } catch (e) {
      onMessage(e instanceof Error ? e.message : 'Không chuyển được');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: TrashCatalogItem) => {
    const preview = item.name.length > 60 ? `${item.name.slice(0, 60)}…` : item.name;
    if (!confirm(`Xóa vật phẩm «${preview}»?`)) return;
    setBusyId(item.id);
    try {
      const res = await adminApi.deleteTrash(item.id);
      onMessage(res.message ?? 'Đã xóa vật phẩm');
      if (editingId === item.id) setEditingId(null);
      onChanged();
    } catch (e) {
      onMessage(e instanceof Error ? e.message : 'Không xóa được');
    } finally {
      setBusyId(null);
    }
  };

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABEL[cat],
    items: items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="trash-catalog">
      <p className="trash-catalog__summary">
        Tổng <strong>{items.length}</strong> vật phẩm — Sửa · Chuyển loại · Xóa trên từng thẻ
      </p>

      {byCategory.map((group) => (
        <section key={group.category} className="trash-catalog__group">
          <h3 className="trash-catalog__group-title">{group.label}</h3>
          <div className="trash-catalog__grid">
            {group.items.map((item) => (
              <article
                key={item.id}
                className={`trash-catalog__card ${!item.active ? 'trash-catalog__card--off' : ''} ${editingId === item.id ? 'trash-catalog__card--edit' : ''}`}
              >
                <div className="trash-catalog__img-wrap">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="trash-catalog__img" />
                  ) : (
                    <span className="trash-catalog__emoji">{item.emoji}</span>
                  )}
                </div>

                <p className="trash-catalog__name" title={item.name}>
                  {item.name}
                </p>

                {!item.active && <span className="trash-catalog__off">Đã tắt</span>}

                <div className="trash-catalog__move">
                  <label className="trash-catalog__move-label">Chuyển sang</label>
                  <select
                    value={item.category}
                    disabled={busyId === item.id}
                    onChange={(e) =>
                      handleQuickMove(item, e.target.value as TrashCategory)
                    }
                  >
                    {CATEGORY_ORDER.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="trash-catalog__actions">
                  <button
                    type="button"
                    className="btn btn-secondary trash-catalog__btn"
                    disabled={busyId === item.id}
                    onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                  >
                    {editingId === item.id ? 'Đóng' : 'Sửa'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary trash-catalog__btn trash-catalog__btn--danger"
                    disabled={busyId === item.id}
                    onClick={() => handleDelete(item)}
                  >
                    Xóa
                  </button>
                </div>

                {editingId === item.id && (
                  <EditTrashForm
                    item={item}
                    onCancel={() => setEditingId(null)}
                    onSaved={(msg) => {
                      setEditingId(null);
                      onMessage(msg);
                      onChanged();
                    }}
                    onError={onMessage}
                  />
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function EditTrashForm({
  item,
  onCancel,
  onSaved,
  onError,
}: {
  item: TrashCatalogItem;
  onCancel: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name')).trim();
    const category = fd.get('category') as TrashCategory;
    const active = fd.get('active') === 'on';

    setSaving(true);
    try {
      if (newImage) {
        const body = new FormData();
        body.append('name', name);
        body.append('category', category);
        body.append('active', active ? 'true' : 'false');
        body.append('image', newImage);
        await adminApi.updateTrashWithImage(item.id, body);
      } else {
        await adminApi.updateTrash(item.id, { name, category, active });
      }
      onSaved('Đã cập nhật vật phẩm');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Lỗi lưu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="trash-catalog__edit" onSubmit={handleSubmit}>
      <input name="name" required defaultValue={item.name} placeholder="Tên" />
      <select name="category" defaultValue={item.category}>
        {CATEGORY_ORDER.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABEL[c]}
          </option>
        ))}
      </select>
      <label className="trash-catalog__check">
        <input type="checkbox" name="active" defaultChecked={item.active} /> Hiển thị trong game
      </label>
      <div>
        <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Đổi ảnh (tùy chọn)</label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setNewImage(f);
            if (preview) URL.revokeObjectURL(preview);
            setPreview(URL.createObjectURL(f));
          }}
        />
        {preview && (
          <img src={preview} alt="" className="trash-catalog__preview-new" />
        )}
      </div>
      <div className="trash-catalog__edit-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>
    </form>
  );
}
