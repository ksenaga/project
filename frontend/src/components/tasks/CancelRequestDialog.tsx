import { useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material'

const REASON_MAX_LENGTH = 200

type Props = {
  taskTitle: string
  onClose: () => void
  // 送れたら閉じる。失敗したらエラーを投げる
  onSend: (reason: string) => Promise<void>
}

// 中止依頼の確認(理由は任意)
const CancelRequestDialog = ({ taskTitle, onClose, onSend }: Props) => {
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    setSending(true)
    setError(null)
    try {
      await onSend(reason.trim())
    } catch (err) {
      setError((err as Error).message)
      setSending(false)
    }
  }

  return (
    <Dialog open onClose={sending ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>中止を依頼</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText sx={{ mb: 2, wordBreak: 'break-word' }}>
          「{taskTitle}」の中止を、管理者とリーダーに依頼します。
        </DialogContentText>
        <TextField
          label="理由（任意）"
          fullWidth
          multiline
          minRows={3}
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={sending}
          helperText={`${reason.length} / ${REASON_MAX_LENGTH}`}
          slotProps={{ htmlInput: { maxLength: REASON_MAX_LENGTH } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={sending} color="inherit">
          キャンセル
        </Button>
        <Button variant="contained" color="warning" onClick={handleSend} loading={sending}>
          依頼する
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CancelRequestDialog
