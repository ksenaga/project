import { Box, Tooltip } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import { LIST_COLOR_PALETTE } from '../../constants/listColor'

type Props = {
  value: string
  onChange: (color: string) => void
  // 読み上げる名前(画面名の色などにも使う)
  label?: string
  // 1行に並べる数(画面名の管理では1行に並べる)
  columns?: number
}

// リスト・画面名の背景色を選ぶ(色の見本をクリック)
const ListColorPicker = ({ value, onChange, label = 'リストの色', columns = 6 }: Props) => (
  <Box
    role="radiogroup"
    aria-label={label}
    sx={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 28px)`, gap: 0.75 }}
  >
    {LIST_COLOR_PALETTE.map((color) => {
      const selected = color.value === value.toLowerCase()
      return (
        <Tooltip key={color.value} title={color.label}>
          <Box
            component="button"
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color.label}
            onClick={() => onChange(color.value)}
            sx={{
              width: 28,
              height: 28,
              p: 0,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 1.5,
              cursor: 'pointer',
              bgcolor: color.value,
              border: 2,
              borderColor: selected ? 'primary.main' : 'rgba(15, 23, 42, 0.12)',
              color: 'primary.main',
              '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: 2 },
            }}
          >
            {selected && <CheckIcon sx={{ fontSize: 18 }} />}
          </Box>
        </Tooltip>
      )
    })}
  </Box>
)

export default ListColorPicker
