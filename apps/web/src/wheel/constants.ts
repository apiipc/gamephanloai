export const WHEEL_TITLE = 'Vòng Quay Xanh';

export const WHEEL_HOW_TO_PLAY = [
  {
    step: 1,
    title: 'Nhận lượt quay',
    desc: 'Mỗi ngày bạn có lượt quay miễn phí. Hoàn thành nhiệm vụ hằng ngày để nhận thêm lượt.',
  },
  {
    step: 2,
    title: 'Quay vòng',
    desc: 'Nhấn nút QUAY ở giữa vòng. Vòng dừng ngẫu nhiên theo tỷ lệ giải do trường cấu hình.',
  },
  {
    step: 3,
    title: 'Nhận quà',
    desc: 'Điểm xanh cộng ngay vào tài khoản. Quà vật phẩm / voucher được ghi nhận — liên hệ GVCN để nhận.',
  },
  {
    step: 4,
    title: 'Tích lũy',
    desc: 'Quay đủ số lần trong ngày có thể nhận thêm 1 lượt quay thưởng. Đổi điểm tích lũy lấy phần thưởng hấp dẫn.',
  },
] as const;

export const WHEEL_RULES_SECTIONS = [
  {
    title: 'Loại phần thưởng',
    items: [
      { label: 'Điểm', desc: 'Cộng trực tiếp vào điểm xanh ⭐', tone: 'score' as const },
      { label: 'Lượt quay', desc: 'Thêm lượt quay trong ngày', tone: 'combo' as const },
      { label: 'Vật phẩm', desc: 'Túi vải, bình nước, túi xanh…', tone: 'easy' as const },
      { label: 'Voucher', desc: 'Mã giảm giá / ưu đãi đối tác', tone: 'medium' as const },
    ],
  },
  {
    title: 'Nhiệm vụ hằng ngày',
    items: [
      { label: 'Phân loại', desc: 'Phân loại đúng rác trong game siêu tốc', tone: 'easy' as const },
      { label: 'Đăng nhập', desc: 'Mở Vòng quay xanh mỗi ngày', tone: 'easy' as const },
      { label: 'Chơi game', desc: 'Hoàn thành đủ vòng phân loại trong ngày', tone: 'medium' as const },
    ],
  },
] as const;

export const WHEEL_PRIZE_LABEL: Record<string, string> = {
  POINTS: 'Điểm xanh',
  SPIN: 'Lượt quay',
  ITEM: 'Vật phẩm xanh',
  VOUCHER: 'Voucher',
};

export const WHEEL_MISSION_KEY_LABEL: Record<string, string> = {
  SORT_CORRECT: 'Phân loại rác đúng (game siêu tốc)',
  DAILY_LOGIN: 'Mở Vòng quay xanh mỗi ngày',
  PLAY_SORT: 'Hoàn thành vòng Phân loại siêu tốc',
};
