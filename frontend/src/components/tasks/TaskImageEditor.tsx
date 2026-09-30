import { useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { TASK_IMAGE_MAX_COUNT, uploadTaskImage, type TaskImage } from '../../api/tasks'
import { imageFilesOf, toScreenshotImage } from '../../utils/screenshotImage'
import TaskImageViewer from './TaskImageViewer'

type Props = {
  projectId: number
  images: TaskImage[]
  // 送り終わるたびに足すので、今の一覧から次の一覧を作る形でも受け取れるようにする(useState の set をそのまま渡せる)
  onChange: Dispatch<SetStateAction<TaskImage[]>>
  // 送っている途中の枚数が変わったとき(送っている間は保存できないようにするため)
  onUploadingChange: (count: number) => void
  disabled: boolean
  // 画像を貼り付けられる入力欄(修正内容)。この中で Ctrl + V しても画像を追加できる
  children: ReactNode
}

// 修正内容に画像(原因となる画面のスクリーンショットなど)を付ける。
// 貼り付け(Ctrl + V)・ドラッグ&ドロップ・「画像を追加」で追加できる。
// 追加した時点でサーバーに送り、タスクを保存したときにタスクに付く(キャンセルしたら付かない)
const TaskImageEditor = ({
  projectId,
  images,
  onChange,
  onUploadingChange,
  disabled,
  children,
}: Props) => {
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [viewing, setViewing] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // 送っている途中の枚数(続けて貼り付けても正しく数えられるよう、ref でも持つ)
  const uploadingRef = useRef(0)

  const changeUploading = (step: number) => {
    uploadingRef.current += step
    setUploading(uploadingRef.current)
    onUploadingChange(uploadingRef.current)
  }

  const addFiles = async (files: File[]) => {
    if (files.length === 0 || disabled) return
    setError(null)
    const room = TASK_IMAGE_MAX_COUNT - images.length - uploadingRef.current
    if (room <= 0) {
      setError(`画像は${TASK_IMAGE_MAX_COUNT}枚までです`)
      return
    }
    if (files.length > room)
      setError(`画像は${TASK_IMAGE_MAX_COUNT}枚までです（${room}枚だけ追加しました）`)
    // 選んだ順に並ぶよう、1枚ずつ送る
    for (const file of files.slice(0, room)) {
      changeUploading(1)
      try {
        const image = await uploadTaskImage(projectId, await toScreenshotImage(file))
        onChange((current) => [...current, image])
      } catch (err) {
        setError((err as Error).message)
      } finally {
        changeUploading(-1)
      }
    }
  }

  return (
    <Box
      // 修正内容の入力欄や、この欄の中での貼り付け(画像のときだけ。文字はそのまま貼り付ける)
      onPaste={(e) => {
        const files = imageFilesOf(e.clipboardData)
        if (files.length === 0) return
        e.preventDefault()
        void addFiles(files)
      }}
      onDragOver={(e) => {
        if (disabled || !e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={(e) => {
        const files = imageFilesOf(e.dataTransfer)
        setDragging(false)
        if (files.length === 0) return
        e.preventDefault()
        void addFiles(files)
      }}
      sx={{
        borderRadius: 1,
        outline: dragging ? 2 : 0,
        outlineStyle: 'dashed',
        outlineColor: 'primary.main',
        outlineOffset: 4,
      }}
    >
      {children}
      <Stack spacing={1} sx={{ mt: 1 }}>
        {error && (
          <Alert severity="warning" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {(images.length > 0 || uploading > 0) && (
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
            {images.map((image, i) => (
              <Box key={image.id} sx={{ position: 'relative' }}>
                <ButtonBase
                  onClick={() => setViewing(i)}
                  aria-label={`修正内容の画像 ${i + 1} を大きく表示`}
                  sx={{ borderRadius: 1, overflow: 'hidden', border: 1, borderColor: 'divider' }}
                >
                  <Box
                    component="img"
                    src={image.url}
                    alt=""
                    sx={{ height: 80, maxWidth: 150, objectFit: 'cover', display: 'block' }}
                  />
                </ButtonBase>
                <Tooltip title="画像を外す">
                  <IconButton
                    size="small"
                    aria-label={`修正内容の画像 ${i + 1} を外す`}
                    onClick={() => onChange(images.filter((img) => img.id !== image.id))}
                    disabled={disabled}
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      p: 0.25,
                      bgcolor: 'rgba(15, 23, 42, 0.7)',
                      color: 'common.white',
                      '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.9)' },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
            {Array.from({ length: uploading }, (_, i) => (
              <Box
                key={`uploading-${i}`}
                sx={{
                  width: 110,
                  height: 80,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: 'grey.50',
                }}
                aria-label="画像を送っています"
              >
                <CircularProgress size={22} />
              </Box>
            ))}
          </Stack>
        )}
        <Stack
          direction="row"
          useFlexGap
          sx={{ alignItems: 'center', flexWrap: 'wrap', columnGap: 1.5, rowGap: 0.5 }}
        >
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddPhotoAlternateOutlinedIcon />}
            onClick={() => fileRef.current?.click()}
            disabled={disabled || images.length + uploading >= TASK_IMAGE_MAX_COUNT}
            sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            画像を追加
          </Button>
          <Typography variant="caption" color="text.secondary">
            スクリーンショットは Ctrl + V で貼り付け・ドラッグ＆ドロップもできます（
            {TASK_IMAGE_MAX_COUNT}枚まで）
          </Typography>
        </Stack>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          aria-label="修正内容の画像"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])]
            e.target.value = ''
            void addFiles(files)
          }}
        />
      </Stack>
      {viewing !== null && (
        <TaskImageViewer images={images} initialIndex={viewing} onClose={() => setViewing(null)} />
      )}
    </Box>
  )
}

export default TaskImageEditor
