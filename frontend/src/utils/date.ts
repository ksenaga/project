// "2027-03-01" → "2027/03/01"
export const formatDate = (date: string) => date.replaceAll('-', '/')

// 今日から期限までの日数(過ぎていればマイナス)
export const daysUntil = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86_400_000)
}
