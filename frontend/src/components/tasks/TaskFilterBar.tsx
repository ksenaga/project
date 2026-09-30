import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ClearIcon from '@mui/icons-material/Clear'
import SearchIcon from '@mui/icons-material/Search'
import type { Screen } from '../../api/screens'
import { EMPTY_TASK_FILTER, isFiltering, type TaskFilter } from '../../api/tasks'
import {
  DEADLINE_COLOR_STYLE,
  DEADLINE_COLORS,
  type DeadlineColor,
} from '../../constants/deadlineColor'
import type { Tag } from '../../api/tags'
import type { Member } from '../../api/users'
import TagLabel from '../TagLabel'
import UserAvatar from '../UserAvatar'

type Props = {
  filter: TaskFilter
  onChange: (filter: TaskFilter) => void
  members: Member[]
  screens: Screen[]
  tags: Tag[]
  // 絞り込み中の表示件数(絞り込んでいないときは null)
  resultCount: number | null
}

const fieldSx = { bgcolor: 'background.paper' }

// タスク一覧の絞り込み(文字・担当者・タグ・画面名・期限・期限の色。すべての条件に当てはまるものを表示)
const TaskFilterBar = ({ filter, onChange, members, screens, tags, resultCount }: Props) => {
  const active = isFiltering(filter)

  return (
    <Stack
      direction="row"
      spacing={1.5}
      useFlexGap
      sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 2 }}
      role="search"
      aria-label="タスクの絞り込み"
    >
      <TextField
        size="small"
        placeholder="タイトル・説明・メモなどで検索"
        value={filter.q}
        onChange={(e) => onChange({ ...filter, q: e.target.value })}
        sx={{ width: 240, bgcolor: 'background.paper' }}
        slotProps={{
          htmlInput: { 'aria-label': '文字で検索', maxLength: 100 },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: filter.q !== '' && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label="検索文字を消す"
                  onClick={() => onChange({ ...filter, q: '' })}
                  edge="end"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      <TextField
        select
        size="small"
        label="担当者"
        value={filter.assigneeId}
        onChange={(e) =>
          onChange({ ...filter, assigneeId: e.target.value === '' ? '' : Number(e.target.value) })
        }
        sx={{ width: 180, bgcolor: 'background.paper' }}
      >
        <MenuItem value="">すべて</MenuItem>
        {members.map((m) => (
          <MenuItem key={m.id} value={m.id}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <UserAvatar user={m} size={20} />
              <span>{m.name}</span>
            </Stack>
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="タグ"
        value={filter.tagId}
        onChange={(e) =>
          onChange({ ...filter, tagId: e.target.value === '' ? '' : Number(e.target.value) })
        }
        sx={{ width: 160, bgcolor: 'background.paper' }}
      >
        <MenuItem value="">すべて</MenuItem>
        {tags.map((tag) => (
          <MenuItem key={tag.id} value={tag.id} title={tag.description}>
            <TagLabel tag={tag} />
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="画面名"
        value={filter.screenId}
        onChange={(e) => {
          const value = e.target.value as string | number
          onChange({
            ...filter,
            screenId: value === '' ? '' : Number(value),
          })
        }}
        sx={{ width: 180, bgcolor: 'background.paper' }}
      >
        <MenuItem value="">すべて</MenuItem>
        {screens.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.name}
          </MenuItem>
        ))}
      </TextField>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <TextField
          type="date"
          size="small"
          label="期限（から）"
          value={filter.deadlineFrom}
          onChange={(e) => onChange({ ...filter, deadlineFrom: e.target.value })}
          sx={{ ...fieldSx, width: 160 }}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { max: filter.deadlineTo || undefined },
          }}
        />
        <Typography color="text.secondary" aria-hidden>
          〜
        </Typography>
        <TextField
          type="date"
          size="small"
          label="期限（まで）"
          value={filter.deadlineTo}
          onChange={(e) => onChange({ ...filter, deadlineTo: e.target.value })}
          sx={{ ...fieldSx, width: 160 }}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { min: filter.deadlineFrom || undefined },
          }}
        />
      </Stack>
      <TextField
        select
        size="small"
        label="期限の色"
        value={filter.deadlineColor}
        onChange={(e) =>
          onChange({ ...filter, deadlineColor: e.target.value as DeadlineColor | '' })
        }
        sx={{ ...fieldSx, width: 190 }}
      >
        <MenuItem value="">すべて</MenuItem>
        {DEADLINE_COLORS.map((color) => {
          const style = DEADLINE_COLOR_STYLE[color]
          return (
            <MenuItem key={color} value={color}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    flexShrink: 0,
                    borderRadius: '50%',
                    bgcolor: style.dot,
                  }}
                  aria-hidden
                />
                <span>
                  {style.label}（{style.description}）
                </span>
              </Stack>
            </MenuItem>
          )
        })}
      </TextField>
      {active && (
        <>
          <Button size="small" color="inherit" onClick={() => onChange(EMPTY_TASK_FILTER)}>
            条件をクリア
          </Button>
          {resultCount !== null && (
            <Typography variant="body2" color="text.secondary" aria-live="polite">
              {resultCount} 件が一致
            </Typography>
          )}
        </>
      )}
    </Stack>
  )
}

export default TaskFilterBar
