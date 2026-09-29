import { Box, Tooltip } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import { LIST_COLOR_PALETTE } from '../../constants/listColor'

type Props = {
  value: string
  onChange: (color: string) => void
}

// リストの背景色を選ぶ(色の見本をクリック)
const ListColorPicker = ({ value, onChange }: Props) => (
  <Box
    role="radiogroup"
    aria-label="リストの色"
    sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 28px)', gap: 0.75 }}
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
