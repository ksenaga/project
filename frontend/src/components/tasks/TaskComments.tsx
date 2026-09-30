import { useEffect, useLayoutEffect, useRef, useState, type SubmitEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { createComment, deleteComment, fetchComments, type Comment } from '../../api/comments'
import { ROLE } from '../../constants/role'
import type { LoginUser } from '../../pages/LoginPage'
import { timeAgo } from '../../utils/date'
import LinkifiedText from '../LinkifiedText'
import UserAvatar from '../UserAvatar'

const BODY_MAX_LENGTH = 2000

type Props = {
  user: LoginUser
  projectId: number
  taskId: number
  // コメントを投稿・削除したとき(ボードのコメント件数を取り直す)
  onChanged: () => void
}

// タスクのコメント(やり取り)。移動したときの自動コメントもここに並ぶ
const TaskComments = ({ user, projectId, taskId, onChanged }: Props) => {
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let ignore = false
    fetchComments(projectId, taskId)
      .then((data) => !ignore && setComments(data))
      .catch((err: unknown) => !ignore && setError((err as Error).message))
    return () => {
      ignore = true
    }
  }, [projectId, taskId])

  // 新しいコメントが見えるよう、一番下までスクロールする
  useLayoutEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [comments?.length])

  const handleSubmit = async (e?: SubmitEvent<HTMLFormElement>) => {
    e?.preventDefault()
    if (body.trim() === '' || sending) return
    setSending(true)
    setError(null)
    try {
      const comment = await createComment(projectId, taskId, body.trim())
      setComments((current) => [...(current ?? []), comment])
      setBody('')
      onChanged()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (comment: Comment) => {
    setError(null)
    try {
      await deleteComment(projectId, taskId, comment.id)
      setComments((current) => current?.filter((c) => c.id !== comment.id) ?? null)
      onChanged()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const count = comments?.filter((c) => c.type === 'comment').length ?? 0

  return (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        {/* 読み込み中は件数を出さない(0件に見えないように) */}
        {comments === null ? 'コメント' : `コメント（${count}）`}
      </Typography>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      <Box
        ref={listRef}
        aria-label="コメント一覧"
        sx={{ flexGrow: 1, minHeight: 120, overflowY: 'auto', pr: 0.5 }}
      >
        {comments === null && !error && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {comments?.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            まだコメントはありません
          </Typography>
        )}
        <Stack spacing={1.5}>
          {comments?.map((comment) =>
            comment.type === 'move' ? (
              // 移動の自動コメント(ログの代わり)
              <Stack
                key={comment.id}
                direction="row"
                spacing={0.75}
                sx={{ alignItems: 'center', color: 'text.secondary', px: 0.5 }}
              >
                <SwapHorizIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption" sx={{ flexGrow: 1, wordBreak: 'break-word' }}>
                  {comment.body}
                </Typography>
                <Typography variant="caption" sx={{ flexShrink: 0 }}>
                  {timeAgo(comment.created_at)}
                </Typography>
              </Stack>
            ) : (
              <Stack key={comment.id} direction="row" spacing={1.25}>
                <UserAvatar user={comment.user} size={28} />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {comment.user.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      title={new Date(comment.created_at).toLocaleString('ja-JP')}
                    >
                      {timeAgo(comment.created_at)}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    {(comment.user.id === user.id || user.role === ROLE.ADMIN) && (
                      <Tooltip title="コメントを削除">
                        <IconButton
                          size="small"
                          aria-label={`${comment.user.name}のコメントを削除`}
                          onClick={() => handleDelete(comment)}
                          sx={{ my: -0.5 }}
                        >
                          <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                  <Box
                    sx={{
                      mt: 0.5,
                      px: 1.25,
                      py: 1,
                      borderRadius: 2,
                      bgcolor: comment.user.id === user.id ? 'rgba(79, 70, 229, 0.08)' : 'grey.100',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    >
                      <LinkifiedText text={comment.body} />
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            ),
          )}
        </Stack>
      </Box>

      <Stack component="form" spacing={1} onSubmit={handleSubmit} noValidate sx={{ mt: 1.5 }}>
        <TextField
          multiline
          minRows={2}
          maxRows={6}
          fullWidth
          placeholder="コメントを書く（Ctrl + Enter で送信）"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          disabled={sending}
          slotProps={{ htmlInput: { maxLength: BODY_MAX_LENGTH, 'aria-label': 'コメント' } }}
        />
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={body.trim() === ''}
            loading={sending}
          >
            送信
          </Button>
        </Stack>
      </Stack>
    </Stack>
  )
}

export default TaskComments
