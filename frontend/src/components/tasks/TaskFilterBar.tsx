import {
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
import TuneIcon from '@mui/icons-material/Tune'
import type { Screen } from '../../api/screens'
import { EMPTY_TASK_FILTER, type TaskFilter } from '../../api/tasks'
import type { Member } from '../../api/users'
import UserAvatar from '../UserAvatar'

type Props = {
  filter: TaskFilter
  onChange: (filter: TaskFilter) => void
  members: Member[]
  screens: Screen[]
  // 絞り込み中の表示件数(絞り込んでいないときは null)
  resultCount: number | null
  onManageScreens: () => void
}

// タスク一覧の絞り込み(文字・担当者・画面名。すべての条件に当てはまるものを表示)
const TaskFilterBar = ({
  filter,
  onChange,
  members,
  screens,
  resultCount,
  onManageScreens,
}: Props) => {
  const active = filter.q !== '' || filter.assigneeId !== '' || filter.screenId !== ''

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
        sx={{ width: 320, bgcolor: 'background.paper' }}
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
        sx={{ width: 200, bgcolor: 'background.paper' }}
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
        label="画面名"
        value={filter.screenId}
        onChange={(e) => {
          const value = e.target.value as string | number
          onChange({
            ...filter,
            screenId: value === '' ? '' : Number(value),
          })
        }}
        sx={{ width: 200, bgcolor: 'background.paper' }}
      >
        <MenuItem value="">すべて</MenuItem>
        {screens.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.name}
          </MenuItem>
        ))}
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
      <Button
        variant="outlined"
        size="small"
        startIcon={<TuneIcon />}
        onClick={onManageScreens}
        sx={{ ml: 'auto', bgcolor: 'background.paper' }}
      >
        画面名の管理
      </Button>
    </Stack>
  )
}

export default TaskFilterBar
