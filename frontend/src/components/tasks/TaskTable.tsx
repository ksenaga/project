import { useState, type ReactNode } from 'react'
import {
  Box,
  Button,
  Checkbox,
  Link,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined'
import type { BoardList } from '../../api/boardLists'
import type { Task, TaskSummary } from '../../api/tasks'
import { DEADLINE_COLOR_STYLE, deadlineColorOf } from '../../constants/deadlineColor'
import { formatDate } from '../../utils/date'
import { listOfTask } from '../../utils/taskPermission'
import TagLabel from '../TagLabel'
import UserAvatar from '../UserAvatar'

// リスト表示のタスク(説明・メモなどは詳細の項目を取得したときだけ入っている)
type Row = TaskSummary & Partial<Task>

type ColumnKey =
  | 'status'
  | 'deadline'
  | 'assignee'
  | 'tags'
  | 'screen'
  | 'detail'
  | 'modified'
  | 'reason'
  | 'git'
  | 'memo'
  | 'comments'

type Column = {
  key: ColumnKey
  label: string
  width: number
  // 並び替えに使う値(文字列は名前の順、数値は小さい順)
  sortValue: (task: Row, lists: BoardList[]) => string | number
  render: (task: Row, lists: BoardList[]) => ReactNode
}

const collator = new Intl.Collator('ja')

// 未入力のときの表示
const Empty = () => (
  <Typography variant="body2" color="text.disabled">
    —
  </Typography>
)

// 長い文章は2行まで表示し、マウスを合わせると全文を出す
const LongText = ({ value }: { value: string | null | undefined }) =>
  value ? (
    <Typography
      variant="body2"
      title={value}
      sx={{
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
      }}
    >
      {value}
    </Typography>
  ) : (
    <Empty />
  )

// 表示できる列(タスク名は常に一番左に表示する)。並びはこの順
const COLUMNS: Column[] = [
  {
    key: 'status',
    label: 'ステータス',
    width: 150,
    // ボードの列の並び順
    sortValue: (task, lists) => lists.findIndex((l) => l.id === listOfTask(task, lists)?.id),
    render: (task, lists) => {
      const list = listOfTask(task, lists)
      return list ? (
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
            bgcolor: list.color,
          }}
        >
          {list.name}
        </Box>
      ) : null
    },
  },
  {
    key: 'deadline',
    label: '期限',
    width: 140,
    sortValue: (task) => task.deadline,
    render: (task) => {
      const color = deadlineColorOf(task)
      const style = color && DEADLINE_COLOR_STYLE[color]
      return (
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
            ...(style ? { bgcolor: style.bg, color: style.text } : { color: 'text.secondary' }),
          }}
        >
          <EventOutlinedIcon sx={{ fontSize: 15 }} />
          {formatDate(task.deadline)}
        </Box>
      )
    },
  },
  {
    key: 'assignee',
    label: '担当者',
    width: 220,
    sortValue: (task) => task.assignees[0]?.name ?? '',
    render: (task) => (
      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
        {task.assignees.map((assignee) => (
          <Stack key={assignee.id} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <UserAvatar user={assignee} size={22} />
            <Typography variant="body2" noWrap>
              {assignee.name}
            </Typography>
          </Stack>
        ))}
      </Stack>
    ),
  },
  {
    key: 'tags',
    label: 'タグ',
    width: 160,
    // 最初のタグの名前の順(タグなしは最後)
    sortValue: (task) => task.tags[0]?.name ?? '￿',
    render: (task) =>
      task.tags.length === 0 ? (
        <Empty />
      ) : (
        <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          {task.tags.map((tag) => (
            <TagLabel key={tag.id} tag={tag} size="medium" />
          ))}
        </Stack>
      ),
  },
  {
    key: 'screen',
    label: '画面名',
    width: 150,
    sortValue: (task) => task.screen?.name ?? '￿',
    render: (task) =>
      task.screen ? (
        <Typography variant="body2" noWrap title={task.screen.name}>
          {task.screen.name}
        </Typography>
      ) : (
        <Empty />
      ),
  },
  {
    key: 'detail',
    label: '説明',
    width: 260,
    sortValue: (task) => task.detail ?? '',
    render: (task) => <LongText value={task.detail} />,
  },
  {
    key: 'modified',
    label: '修正内容',
    width: 220,
    sortValue: (task) => task.modified ?? '￿',
    render: (task) => <LongText value={task.modified} />,
  },
  {
    key: 'reason',
    label: '修正理由',
    width: 220,
    sortValue: (task) => task.reason ?? '￿',
    render: (task) => <LongText value={task.reason} />,
  },
  {
    key: 'git',
    label: 'Git URL',
    width: 220,
    sortValue: (task) => task.git ?? '￿',
    render: (task) =>
      task.git ? (
        /^https?:\/\//.test(task.git) ? (
          <Link
            href={task.git}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            onClick={(e) => e.stopPropagation()}
            title={task.git}
            sx={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {task.git}
          </Link>
        ) : (
          <LongText value={task.git} />
        )
      ) : (
        <Empty />
      ),
  },
  {
    key: 'memo',
    label: 'メモ',
    width: 220,
    sortValue: (task) => task.memo ?? '￿',
    render: (task) => <LongText value={task.memo} />,
  },
  {
    key: 'comments',
    label: 'コメント',
    width: 110,
    sortValue: (task) => task.comment_count,
    // コメントがあるときはアイコンだけ出す(件数は出さない)
    render: (task) =>
      task.comment_count > 0 ? (
        <ChatBubbleOutlineIcon
          aria-label="コメントあり"
          sx={{ fontSize: 16, color: 'text.secondary', display: 'block' }}
        />
      ) : (
        <Empty />
      ),
  },
]

// 最初に表示する列
const DEFAULT_VISIBLE: ColumnKey[] = ['status', 'deadline', 'assignee', 'tags', 'screen']
const VISIBLE_KEY = 'taskTableColumns'

// 表示する列はブラウザに覚えておく
const loadVisible = (): ColumnKey[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(VISIBLE_KEY) ?? 'null')
    if (Array.isArray(saved)) return COLUMNS.map((c) => c.key).filter((k) => saved.includes(k))
  } catch {
    // 読めないときは最初の状態にする
  }
  return DEFAULT_VISIBLE
}

const saveVisible = (keys: ColumnKey[]) => {
  try {
    localStorage.setItem(VISIBLE_KEY, JSON.stringify(keys))
  } catch {
    // 保存できなくても表示は切り替える
  }
}

type SortKey = 'title' | ColumnKey
type Sort = { key: SortKey; direction: 'asc' | 'desc' }

const TITLE_WIDTH = 320

// タスク名の列は、横にスクロールしても左端に残す
const stickyTitleSx = {
  position: 'sticky',
  left: 0,
  zIndex: 1,
  boxShadow: 'inset -1px 0 0 rgba(15, 23, 42, 0.08)',
} as const

type Props = {
  tasks: Row[]
  lists: BoardList[]
  onOpen: (task: Row) => void
  // 渡したときだけ、タスクを追加するボタンを表示する
  onAdd?: () => void
}

// タスクを1行ずつ並べた表。見出しをクリックすると、その列で並び替える。
// 表示する列は「表示する項目」で選べる(タスク名は常に表示)
const TaskTable = ({ tasks, lists, onOpen, onAdd }: Props) => {
  // 最初は期限が近い順
  const [sort, setSort] = useState<Sort>({ key: 'deadline', direction: 'asc' })
  const [visible, setVisible] = useState<ColumnKey[]>(loadVisible)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)

  const columns = COLUMNS.filter((column) => visible.includes(column.key))

  const sortValue = (task: Row) =>
    sort.key === 'title'
      ? task.title
      : (COLUMNS.find((c) => c.key === sort.key)?.sortValue(task, lists) ?? '')

  // 同じ値のときは期限・ID の順にして、並びが毎回変わらないようにする
  const sorted = [...tasks].sort((a, b) => {
    const va = sortValue(a)
    const vb = sortValue(b)
    const result =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : collator.compare(String(va), String(vb))
    if (result !== 0) return sort.direction === 'asc' ? result : -result
    return a.deadline.localeCompare(b.deadline) || a.id - b.id
  })

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )

  const toggleColumn = (key: ColumnKey) => {
    const next = visible.includes(key) ? visible.filter((k) => k !== key) : [...visible, key]
    // 並びは COLUMNS の順にそろえる
    const ordered = COLUMNS.map((c) => c.key).filter((k) => next.includes(k))
    setVisible(ordered)
    saveVisible(ordered)
    // 非表示にした列で並び替えていたら、期限順に戻す
    if (!ordered.includes(sort.key as ColumnKey) && sort.key !== 'title') {
      setSort({ key: 'deadline', direction: 'asc' })
    }
  }

  const resetColumns = () => {
    setVisible(DEFAULT_VISIBLE)
    saveVisible(DEFAULT_VISIBLE)
  }

  const header = (key: SortKey, label: string, width: number) => (
    <TableCell
      key={key}
      sx={{
        width,
        minWidth: width,
        fontWeight: 700,
        bgcolor: 'grey.50',
        whiteSpace: 'nowrap',
        // タスク名の見出しは左端に固定する(上下・左右どちらにスクロールしても残る)
        ...(key === 'title' && { ...stickyTitleSx, zIndex: 3 }),
      }}
      sortDirection={sort.key === key ? sort.direction : false}
    >
      <TableSortLabel
        active={sort.key === key}
        direction={sort.key === key ? sort.direction : 'asc'}
        onClick={() => toggleSort(key)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  )

  return (
    <Stack spacing={1} sx={{ flexGrow: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        {onAdd && (
          <Tooltip title="タスクを追加">
            <Button
              size="small"
              variant="outlined"
              aria-label="タスクを追加"
              onClick={onAdd}
              sx={{ minWidth: 0, px: 0.75, bgcolor: 'background.paper' }}
            >
              <AddIcon fontSize="small" />
            </Button>
          </Tooltip>
        )}
        <Button
          size="small"
          startIcon={<ViewColumnOutlinedIcon />}
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          sx={{ bgcolor: 'background.paper' }}
          variant="outlined"
        >
          表示する項目（{columns.length + 1}）
        </Button>
        <Menu
          anchorEl={menuAnchor}
          open={menuAnchor !== null}
          onClose={() => setMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem disabled dense>
            <Checkbox size="small" checked disabled sx={{ p: 0.5, mr: 1 }} />
            <ListItemText primary="タスク名（常に表示）" />
          </MenuItem>
          {COLUMNS.map((column) => (
            <MenuItem
              key={column.key}
              dense
              onClick={() => toggleColumn(column.key)}
              role="menuitemcheckbox"
              aria-checked={visible.includes(column.key)}
            >
              <Checkbox
                size="small"
                checked={visible.includes(column.key)}
                tabIndex={-1}
                sx={{ p: 0.5, mr: 1 }}
              />
              <ListItemText primary={column.label} />
            </MenuItem>
          ))}
          <MenuItem
            dense
            onClick={resetColumns}
            sx={{ justifyContent: 'center', color: 'primary.main' }}
          >
            最初の表示に戻す
          </MenuItem>
        </Menu>
      </Stack>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}
      >
        <Table stickyHeader size="small" aria-label="タスク一覧">
          <TableHead>
            <TableRow>
              {header('title', 'タスク名', TITLE_WIDTH)}
              {columns.map((column) => header(column.key, column.label, column.width))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    タスクはありません
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {sorted.map((task) => (
              <TableRow
                key={task.id}
                hover
                onClick={() => onOpen(task)}
                sx={{
                  cursor: 'pointer',
                  '& td': { py: 1.25, verticalAlign: 'middle' },
                  '&.MuiTableRow-hover:hover': { bgcolor: 'grey.100' },
                }}
              >
                <TableCell
                  sx={{
                    maxWidth: TITLE_WIDTH,
                    ...stickyTitleSx,
                    // 固定した列は背景がないと下の列が透けるので、行と同じ色にする
                    bgcolor: 'background.paper',
                    '.MuiTableRow-hover:hover &': { bgcolor: 'grey.100' },
                  }}
                >
                  {/* キーボードでも詳細を開けるよう、タスク名をボタンにする */}
                  <Box
                    component="button"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpen(task)
                    }}
                    title={task.title}
                    sx={{
                      all: 'unset',
                      display: 'block',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                      '&:hover': { color: 'primary.main' },
                      '&:focus-visible': {
                        outline: 2,
                        outlineColor: 'primary.main',
                        borderRadius: 0.5,
                      },
                    }}
                  >
                    {task.title}
                  </Box>
                </TableCell>
                {columns.map((column) => (
                  <TableCell key={column.key} sx={{ maxWidth: column.width }}>
                    {column.render(task, lists)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  )
}

export default TaskTable
