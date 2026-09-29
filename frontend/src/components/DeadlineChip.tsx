import { Chip } from '@mui/material'
import { daysUntil } from '../utils/date'

// 期限切れ・期限間近のときだけ表示する
const DeadlineChip = ({ deadline }: { deadline: string }) => {
  const days = daysUntil(deadline)
  if (days < 0) return <Chip label="期限切れ" size="small" color="error" />
  if (days === 0) return <Chip label="今日まで" size="small" color="warning" />
  if (days <= 7)
    return <Chip label={`あと${days}日`} size="small" color="warning" variant="outlined" />
  return null
}

export default DeadlineChip
