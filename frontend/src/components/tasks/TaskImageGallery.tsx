import { useState } from 'react'
import { Box, ButtonBase, Stack } from '@mui/material'
import type { TaskImage } from '../../api/tasks'
import TaskImageViewer from './TaskImageViewer'

// 画像のサムネイルを並べる。押すと大きく表示する
const TaskImageGallery = ({ images }: { images: TaskImage[] }) => {
  const [open, setOpen] = useState<number | null>(null)
  if (images.length === 0) return null

  return (
    <>
      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1, mt: 1 }}>
        {images.map((image, i) => (
          <ButtonBase
            key={image.id}
            onClick={() => setOpen(i)}
            aria-label={`修正内容の画像 ${i + 1} を大きく表示`}
            sx={{ borderRadius: 1, overflow: 'hidden', border: 1, borderColor: 'divider' }}
          >
            <Box
              component="img"
              src={image.url}
              alt=""
              loading="lazy"
              sx={{ height: 96, maxWidth: 180, objectFit: 'cover', display: 'block' }}
            />
          </ButtonBase>
        ))}
      </Stack>
      {open !== null && (
        <TaskImageViewer images={images} initialIndex={open} onClose={() => setOpen(null)} />
      )}
    </>
  )
}

export default TaskImageGallery
