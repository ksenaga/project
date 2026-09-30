import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  FormControlLabel,
  InputAdornment,
  Link,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import SearchIcon from '@mui/icons-material/Search'
import { Link as RouterLink, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { fetchMyTasks, type MyTask } from '../api/tasks'
import { useAuth } from '../auth/AuthContext'
import TagLabel from '../components/TagLabel'
import {
  DEADLINE_COLORS,
  DEADLINE_COLOR_STYLE,
  deadlineColorOf,
  type DeadlineColor,
} from '../constants/deadlineColor'
import { formatDate } from '../utils/date'

type SortKey = 'title' | 'project' | 'deadline'
type Sort = { key: SortKey; direction: 'asc' | 'desc' }

const collator = new Intl.Collator('ja')

const sortValue = (task: MyTask, key: SortKey) =>
  key === 'title' ? task.title : key === 'project' ? task.project.name : task.deadline

// タスクの詳細を開く URL(そのプロジェクトのタスク一覧で詳細を開く)
const taskUrl = (task: MyTask) => `/projects/${task.project.id}/tasks?task=${task.id}`

// 自分が担当しているタスクを、プロジェクトをまたいで期限が近い順に並べる
const MyTasksPage = () => {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<MyTask[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [includeClosed, setIncludeClosed] = useState(false)
  const [q, setQ] = useState('')
  const [projectId, setProjectId] = useState<number | ''>('')
  const [color, setColor] = useState<DeadlineColor | ''>('')
  const [sort, setSort] = useState<Sort>({ key: 'deadline', direction: 'asc' })

  // 401(ログイン切れ)ならログイン画面に戻す
  const handleAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) setUser(null)
    },
    [setUser],
  )

  useEffect(() => {
    let ignore = false
    fetchMyTasks({ includeClosed })
      .then((data) => {
        if (ignore) return
        setTasks(data)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (ignore) return
        handleAuthError(err)
        setLoadError((err as Error).message)
      })
    return () => {
      ignore = true
    }
  }, [includeClosed, handleAuthError])

  // プロジェクトの選択肢(担当しているタスクがあるプロジェクトだけ。名前順)
  const projects = [
    ...new Map((tasks ?? []).map((task) => [task.project.id, task.project])).values(),
  ].sort((a, b) => collator.compare(a.name, b.name))

  // 期限の色ごとの件数(文字・プロジェクトで絞り込んだあと)
  const keyword = q.trim().toLowerCase()
  const base = (tasks ?? []).filter(
    (task) =>
      (keyword === '' || task.title.toLowerCase().includes(keyword)) &&
      (projectId === '' || task.project.id === projectId),
  )
  const counts = Object.fromEntries(
    DEADLINE_COLORS.map((c) => [c, base.filter((task) => deadlineColorOf(task) === c).length]),
  ) as Record<DeadlineColor, number>

  const shown = base
    .filter((task) => color === '' || deadlineColorOf(task) === color)
    .sort((a, b) => {
      const result = collator.compare(sortValue(a, sort.key), sortValue(b, sort.key))
      if (result !== 0) return sort.direction === 'asc' ? result : -result
      return a.deadline.localeCompare(b.deadline) || a.id - b.id
    })

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )

  const header = (key: SortKey, label: string) => (
    <TableSortLabel
      active={sort.key === key}
      direction={sort.key === key ? sort.direction : 'asc'}
      onClick={() => toggleSort(key)}
    >
      {label}
    </TableSortLabel>
  )

  const filtering = keyword !== '' || projectId !== '' || color !== ''
  const headSx = { fontWeight: 700, bgcolor: 'grey.50', whiteSpace: 'nowrap' }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          タスク一覧
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {tasks === null
            ? ' '
            : `担当している${includeClosed ? '' : '未完了の'}タスク ${tasks.length} 件（期限が近い順）`}
        </Typography>
      </Box>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {/* 期限の色ごとの件数。押すとその色だけに絞り込む(もう一度押すと解除) */}
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 2 }}>
        {DEADLINE_COLORS.map((c) => {
          const style = DEADLINE_COLOR_STYLE[c]
          const selected = color === c
          return (
            <Chip
              key={c}
              label={`${style.description} ${tasks === null ? '-' : counts[c]} 件`}
              onClick={() => setColor(selected ? '' : c)}
              aria-pressed={selected}
              sx={{
                fontWeight: 600,
                bgcolor: style.bg,
                color: style.text,
                border: 2,
                borderColor: selected ? style.dot : 'transparent',
                '&:hover': { bgcolor: style.bg, filter: 'brightness(0.97)' },
              }}
            />
          )
        })}
      </Stack>

      <Stack
        direction="row"
        spacing={1.5}
        useFlexGap
        sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 2 }}
        role="search"
        aria-label="タスク一覧の絞り込み"
      >
        <TextField
          size="small"
          placeholder="タスク名で検索"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ width: 240, bgcolor: 'background.paper' }}
          slotProps={{
            htmlInput: { 'aria-label': 'タスク名で検索', maxLength: 100 },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          size="small"
          label="プロジェクト"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value === '' ? '' : Number(e.target.value))}
          sx={{ width: 220, bgcolor: 'background.paper' }}
        >
          <MenuItem value="">すべて</MenuItem>
          {projects.map((project) => (
            <MenuItem key={project.id} value={project.id}>
              {project.name}
            </MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          control={
            <Switch checked={includeClosed} onChange={(e) => setIncludeClosed(e.target.checked)} />
          }
          label="完了・対応中止も表示"
          slotProps={{ typography: { variant: 'body2' } }}
        />
        {filtering && (
          <>
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                setQ('')
                setProjectId('')
                setColor('')
              }}
            >
              条件をクリア
            </Button>
            <Typography variant="body2" color="text.secondary">
              {shown.length} 件が一致
            </Typography>
          </>
        )}
      </Stack>

      {tasks === null && !loadError && <Skeleton variant="rounded" height={240} />}

      {tasks && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" stickyHeader aria-label="タスク一覧">
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...headSx, minWidth: 280 }}>
                  {header('title', 'タスク名')}
                </TableCell>
                <TableCell sx={{ ...headSx, minWidth: 180 }}>
                  {header('project', 'プロジェクト')}
                </TableCell>
                <TableCell sx={headSx}>ステータス</TableCell>
                <TableCell sx={headSx}>{header('deadline', '期限')}</TableCell>
                <TableCell sx={headSx}>タグ</TableCell>
                <TableCell sx={headSx}>画面名</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shown.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    sx={{ py: 5, textAlign: 'center', color: 'text.secondary' }}
                  >
                    {tasks.length === 0
                      ? '担当しているタスクはありません'
                      : '条件に一致するタスクはありません'}
                  </TableCell>
                </TableRow>
              )}
              {shown.map((task) => {
                const deadlineColor = deadlineColorOf(task)
                const style = deadlineColor && DEADLINE_COLOR_STYLE[deadlineColor]
                return (
                  <TableRow
                    key={task.id}
                    hover
                    onClick={() => navigate(taskUrl(task))}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        {/* Ctrl(⌘)+クリックで別タブでも開けるよう、タスク名はリンクにする */}
                        <Link
                          component={RouterLink}
                          to={taskUrl(task)}
                          onClick={(e) => e.stopPropagation()}
                          underline="none"
                          color="inherit"
                          title={task.title}
                          sx={{
                            flex: '1 1 auto',
                            minWidth: 0,
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            '&:hover': { color: 'primary.main' },
                          }}
                        >
                          {task.title}
                        </Link>
                        {task.comment_count > 0 && (
                          <Tooltip title="コメントあり">
                            <ChatBubbleOutlineIcon
                              aria-label="コメントあり"
                              sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }}
                            />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="body2" noWrap title={task.project.name}>
                        {task.project.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-block',
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          fontSize: 13,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          bgcolor: task.list?.color ?? 'grey.100',
                        }}
                      >
                        {task.list?.name ?? task.status}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 1,
                          fontSize: 13,
                          whiteSpace: 'nowrap',
                          fontWeight: style ? 600 : undefined,
                          ...(style
                            ? { bgcolor: style.bg, color: style.text }
                            : { color: 'text.secondary' }),
                        }}
                      >
                        <EventOutlinedIcon sx={{ fontSize: 15 }} />
                        {formatDate(task.deadline)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {task.tags.length === 0 ? (
                        <Typography variant="body2" color="text.disabled">
                          —
                        </Typography>
                      ) : (
                        <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                          {task.tags.map((tag) => (
                            <TagLabel key={tag.id} tag={tag} />
                          ))}
                        </Stack>
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 180 }}>
                      <Typography
                        variant="body2"
                        noWrap
                        color={task.screen ? undefined : 'text.disabled'}
                        title={task.screen?.name}
                      >
                        {task.screen?.name ?? '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  )
}

export default MyTasksPage
