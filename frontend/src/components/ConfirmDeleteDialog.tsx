import { useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { CancelIconButton } from './ActionIconButtons'

type Props = {
  title: string
  message: string
  onClose: () => void
  onConfirm: () => Promise<void>
}

const ConfirmDeleteDialog = ({ title, message, onClose, onConfirm }: Props) => {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setDeleting(true)
    setError(null)
    try {
      await onConfirm()
    } catch (err) {
      setError((err as Error).message)
      setDeleting(false)
    }
  }

  return (
    <Dialog open onClose={deleting ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText sx={{ wordBreak: 'break-word' }}>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <CancelIconButton onClick={onClose} disabled={deleting} />
        <Button onClick={handleConfirm} variant="contained" color="error" loading={deleting}>
          削除
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConfirmDeleteDialog
