// "2027-03-01" → "2027/03/01"
export const formatDate = (date: string) => date.replaceAll('-', '/')

// 今日から期限までの日数(過ぎていればマイナス)
export const daysUntil = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86_400_000)
}

// 「たった今」「5分前」「3時間前」「2日前」、1週間より前は日付
export const timeAgo = (iso: string) => {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'たった今'
  if (minutes < 60) return `${minutes}分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}日前`
  return new Date(iso).toLocaleDateString('ja-JP')
}
