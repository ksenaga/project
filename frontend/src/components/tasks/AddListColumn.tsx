import { useState, type SubmitEvent } from 'react'
import { Box, Button, IconButton, Stack, TextField, Tooltip } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import { LIST_WIDTH } from '../../constants/board'
import { DEFAULT_LIST_COLOR } from '../../constants/listColor'
import ListColorPicker from './ListColorPicker'

const NAME_MAX_LENGTH = 50

type Props = {
  // 追加できたら true
  onAdd: (name: string, color: string) => Promise<boolean>
}

// ボードの一番右に置く「リストを追加」(リストと同じ見た目)
const AddListColumn = ({ onAdd }: Props) => {
  const [name, setName] = useState<string | null>(null)
  const [color, setColor] = useState<string>(DEFAULT_LIST_COLOR)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (name === null || name.trim() === '') return
    setSaving(true)
    const added = await onAdd(name.trim(), color)
    setSaving(false)
    // 続けて追加できるよう、入力欄は開いたままにする
    if (added) setName('')
  }

  return (
    <Box
      sx={{
        // 幅は固定(タスク名の長さで変わらない)。入りきらないときはボードが横スクロールする
        flex: `0 0 ${LIST_WIDTH}px`,
        width: LIST_WIDTH,
        // 入力中は、選んだ色で仕上がりが分かるようにする
        bgcolor: name === null ? 'rgba(238, 242, 247, 0.6)' : color,
        borderRadius: 3,
        border: 2,
        borderColor: 'transparent',
        p: 1,
      }}
    >
      {name === null ? (
        <Button
          fullWidth
          color="inherit"
          startIcon={<AddIcon />}
          onClick={() => setName('')}
          sx={{ justifyContent: 'flex-start', color: 'text.secondary', py: 0.75 }}
        >
          リストを追加
        </Button>
      ) : (
        <Stack component="form" spacing={1} onSubmit={handleSubmit} noValidate>
          <TextField
            size="small"
            autoFocus
            placeholder="リスト名を入力"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setName(null)}
            disabled={saving}
            slotProps={{
              htmlInput: { maxLength: NAME_MAX_LENGTH, 'aria-label': '追加するリスト名' },
            }}
            sx={{ bgcolor: 'background.paper' }}
          />
          <ListColorPicker value={color} onChange={setColor} />
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              size="small"
              disabled={name.trim() === ''}
              loading={saving}
            >
              追加
            </Button>
            <Tooltip title="閉じる">
              <IconButton
                size="small"
                aria-label="リストの追加をやめる"
                onClick={() => setName(null)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      )}
    </Box>
  )
}

export default AddListColumn
