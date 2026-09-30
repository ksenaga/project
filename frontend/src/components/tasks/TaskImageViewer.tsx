import { useState } from 'react'
import { Box, Button, Dialog, DialogActions, IconButton, Stack, Typography } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import type { TaskImage } from '../../api/tasks'

type Props = {
  images: TaskImage[]
  // 最初に表示する画像
  initialIndex: number
  onClose: () => void
}

// 画像を大きく表示する。複数あるときは ← → (ボタンか矢印キー)で切り替える
const TaskImageViewer = ({ images, initialIndex, onClose }: Props) => {
  const [index, setIndex] = useState(initialIndex)
  const image = images[index]
  const move = (step: number) => setIndex((i) => (i + step + images.length) % images.length)

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth={false}
      onKeyDown={(e) => {
        if (images.length < 2) return
        if (e.key === 'ArrowLeft') move(-1)
        if (e.key === 'ArrowRight') move(1)
      }}
      slotProps={{ paper: { sx: { bgcolor: 'grey.900', color: 'common.white' } } }}
    >
      <Box sx={{ position: 'relative', display: 'grid', placeItems: 'center', p: 1 }}>
        <Box
          component="img"
          src={image.url}
          alt={`修正内容の画像 ${index + 1}`}
          sx={{ maxWidth: '90vw', maxHeight: '80vh', display: 'block', objectFit: 'contain' }}
        />
        {images.length > 1 &&
          (
            [
              [-1, '前の画像', ChevronLeftIcon, { left: 8 }],
              [1, '次の画像', ChevronRightIcon, { right: 8 }],
            ] as const
          ).map(([step, label, Icon, position]) => (
            <IconButton
              key={label}
              aria-label={label}
              onClick={() => move(step)}
              sx={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                ...position,
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                color: 'common.white',
                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
              }}
            >
              <Icon />
            </IconButton>
          ))}
      </Box>
      <DialogActions sx={{ justifyContent: 'space-between', px: 2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {images.length > 1 && (
            <Typography variant="body2" sx={{ color: 'grey.400' }}>
              {index + 1} / {images.length}
            </Typography>
          )}
          <Button
            size="small"
            href={image.url}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<OpenInNewIcon />}
            sx={{ color: 'grey.300' }}
          >
            別タブで開く
          </Button>
        </Stack>
        <Button onClick={onClose} sx={{ color: 'common.white' }}>
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default TaskImageViewer
