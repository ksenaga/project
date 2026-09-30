import type { ReactElement } from 'react'
import { CircularProgress, IconButton, Tooltip, type IconButtonProps } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'

type Props = Pick<IconButtonProps, 'onClick' | 'disabled' | 'type' | 'size' | 'sx'> & {
  // 送信中(保存中)は、アイコンの代わりにくるくるを出して押せなくする
  loading?: boolean
}

// 押せないときもツールチップを出せるよう、span で包む
const withTooltip = (title: string, button: ReactElement) => (
  <Tooltip title={title}>
    <span>{button}</span>
  </Tooltip>
)

// 「保存」ボタン(アイコン)。色は主の色
export const SaveIconButton = ({ loading = false, disabled, ...props }: Props) =>
  withTooltip(
    '保存',
    <IconButton aria-label="保存" color="primary" disabled={disabled || loading} {...props}>
      {loading ? <CircularProgress size={20} /> : <SaveIcon />}
    </IconButton>,
  )

// 「キャンセル」ボタン(アイコン)
export const CancelIconButton = ({ loading: _loading, ...props }: Props) =>
  withTooltip(
    'キャンセル',
    <IconButton aria-label="キャンセル" {...props}>
      <CloseIcon />
    </IconButton>,
  )
