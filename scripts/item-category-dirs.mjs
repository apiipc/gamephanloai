/** Thư mục con trong public/assets/items/ theo loại rác */
export const CATEGORY_DIR = {
  ORGANIC: 'huu-co',
  RECYCLE: 'tai-che',
  OTHER: 'khac',
};

export function itemImageUrl(slug, category) {
  return `/assets/items/${CATEGORY_DIR[category]}/${slug}.png`;
}

export function itemOutPath(itemsRoot, slug, category) {
  return `${itemsRoot}/${CATEGORY_DIR[category]}/${slug}.png`;
}
