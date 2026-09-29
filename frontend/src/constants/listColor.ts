// 追加するリストの背景色(明るめの色。同じ色を選んでもよい)
export const LIST_COLOR_PALETTE = [
  { value: '#f1f5f9', label: 'グレー' },
  { value: '#e2e8f0', label: 'スレート' },
  { value: '#dbeafe', label: '青' },
  { value: '#e0f2fe', label: '水色' },
  { value: '#ccfbf1', label: '青緑' },
  { value: '#dcfce7', label: '緑' },
  { value: '#ecfccb', label: '黄緑' },
  { value: '#fef3c7', label: '黄色' },
  { value: '#ffedd5', label: 'オレンジ' },
  { value: '#fee2e2', label: '赤' },
  { value: '#fce7f3', label: 'ピンク' },
  { value: '#ede9fe', label: '紫' },
] as const

export const DEFAULT_LIST_COLOR = LIST_COLOR_PALETTE[0].value
