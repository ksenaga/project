import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import {
  Badge,
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  Popover,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import AlarmOutlinedIcon from '@mui/icons-material/AlarmOutlined'
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined'
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined'
import { useNavigate } from 'react-router'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from '../api/notifications'
import { timeAgo } from '../utils/date'

// 新しい通知を確認する間隔(ミリ秒)
const POLL_INTERVAL = 30_000

const ICONS = {
  project_member: FolderSharedOutlinedIcon,
  task_assignee: AssignmentIndOutlinedIcon,
  task_review: RateReviewOutlinedIcon,
  task_cancel_request: BlockOutlinedIcon,
  task_comment: ChatBubbleOutlineIcon,
  task_mention: AlternateEmailIcon,
  task_deadline: AlarmOutlinedIcon,
}

// ヘッダーのベル。未読の件数を表示し、クリックで通知の一覧を開く。
// 30秒ごとと、タブに戻ってきたときに新しい通知を確認する
const NotificationBell = () => {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [toast, setToast] = useState(false)
  const bellRef = useRef<HTMLButtonElement>(null)
  // 最初の読み込みでは「新しい通知があります」を出さない
  const lastUnread = useRef<number | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchNotifications()
      setNotifications(data.notifications)
      setUnread(data.unread_count)
      if (lastUnread.current !== null && data.unread_count > lastUnread.current) setToast(true)
      lastUnread.current = data.unread_count
    } catch {
      // 通知が取れなくても画面の操作は続けられるようにする(ログイン切れは他の画面で扱う)
    }
  }, [])

  useEffect(() => {
    const first = setTimeout(load, 0)
    const timer = setInterval(load, POLL_INTERVAL)
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  const open = (e: MouseEvent<HTMLElement>) => {
    setAnchor(e.currentTarget)
    load()
  }

  // 既読にして、タスク(またはプロジェクト)の画面へ移動する
  const handleClick = async (notification: Notification) => {
    setAnchor(null)
    if (!notification.read) {
      setNotifications((current) =>
        current.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      )
      setUnread((count) => Math.max(0, count - 1))
      lastUnread.current = Math.max(0, (lastUnread.current ?? 1) - 1)
      markNotificationRead(notification.id).catch(() => {})
    }
    const path = `/projects/${notification.project_id}/tasks`
    navigate(notification.task_id ? `${path}?task=${notification.task_id}` : path)
  }

  const handleReadAll = async () => {
    setNotifications((current) => current.map((n) => ({ ...n, read: true })))
    setUnread(0)
    lastUnread.current = 0
    await markAllNotificationsRead().catch(() => {})
  }

  return (
    <>
      <Tooltip title="通知">
        <IconButton
          ref={bellRef}
          aria-label={unread > 0 ? `通知（未読${unread}件）` : '通知'}
          onClick={open}
        >
          <Badge badgeContent={unread} color="error" max={99}>
            <NotificationsNoneIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: { sx: { width: 400, maxHeight: 520, display: 'flex', flexDirection: 'column' } },
        }}
      >
        <Stack
          direction="row"
          sx={{ alignItems: 'center', px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>
            通知
          </Typography>
          <Button size="small" onClick={handleReadAll} disabled={unread === 0}>
            すべて既読にする
          </Button>
        </Stack>
        {notifications.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 4, textAlign: 'center' }}>
            通知はありません
          </Typography>
        ) : (
          <List disablePadding sx={{ overflowY: 'auto' }}>
            {notifications.map((notification) => {
              const Icon = ICONS[notification.type]
              return (
                <ListItemButton
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  divider
                  sx={{
                    alignItems: 'flex-start',
                    gap: 1.5,
                    py: 1.25,
                    bgcolor: notification.read ? undefined : 'rgba(79, 70, 229, 0.06)',
                  }}
                >
                  <Icon
                    fontSize="small"
                    sx={{ mt: 0.25, color: notification.read ? 'text.disabled' : 'primary.main' }}
                  />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: notification.read ? 400 : 600, wordBreak: 'break-word' }}
                    >
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {timeAgo(notification.created_at)}
                    </Typography>
                  </Box>
                  {!notification.read && (
                    <Box
                      aria-label="未読"
                      sx={{
                        width: 8,
                        height: 8,
                        mt: 0.75,
                        flexShrink: 0,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                      }}
                    />
                  )}
                </ListItemButton>
              )
            })}
          </List>
        )}
      </Popover>

      <Snackbar
        open={toast}
        autoHideDuration={4000}
        onClose={() => setToast(false)}
        message="新しい通知があります"
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        // ヘッダー(高さ 64px)のベルやログアウトに重ならないよう、ヘッダーの下に出す
        sx={{ top: { xs: 72, sm: 72 } }}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => {
              setToast(false)
              setAnchor(bellRef.current)
            }}
          >
            見る
          </Button>
        }
      />
    </>
  )
}

export default NotificationBell
