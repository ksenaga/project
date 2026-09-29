import {
  useState,
  type KeyboardEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from 'react'
import {
  Box,
  Divider,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { BoardList } from '../../api/boardLists'
import { listDndId } from '../../utils/taskPermission'
import ListColorPicker from './ListColorPicker'

const NAME_MAX_LENGTH = 50

type Props = {
  list: BoardList
  count: number
  // ドラッグ中のカードをこの列に置けるか(カードをドラッグしていないときは undefined)
  acceptsDrop?: boolean
  canAdd: boolean
  onAdd: () => void
  // リストの並べ替え・名前や色の変更・削除ができるか(管理者と担当しているリーダー)
  canManage: boolean
  // 変更できたら true
  onUpdate: (fields: { name?: string; color?: string }) => Promise<boolean>
  onDelete: () => void
  children: ReactNode
}

// ボードのリスト(列)。カードをドロップするとそのリストに移動する。
// 見出しをつかんでドラッグすると、リストを並べ替えられる(カードと同じ操作)
const TaskColumn = ({
  list,
  count,
  acceptsDrop,
  canAdd,
  onAdd,
  canManage,
  onUpdate,
  onDelete,
  children,
}: Props) => {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null)
  const [editingName, setEditingName] = useState<string | null>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: listDndId(list),
    data: { type: 'list', list },
    // 名前を変えている間はドラッグしない(文字を選択できるように)
    disabled: {
      draggable: !canManage || editingName !== null,
      droppable: acceptsDrop === false,
    },
  })

  const draggingCard = acceptsDrop !== undefined
  const isCustom = list.status === null
  const draggable = canManage && editingName === null
  // マウス・タッチは見出し全体、キーボードはつまみで並べ替える
  const onPointerDown = draggable
    ? (listeners?.onPointerDown as PointerEventHandler<HTMLDivElement> | undefined)
    : undefined
  const onKeyDown = draggable
    ? (listeners?.onKeyDown as KeyboardEventHandler<HTMLDivElement> | undefined)
    : undefined

  const saveName = async () => {
    if (editingName === null) return
    const name = editingName.trim()
    if (name === '' || name === list.name) {
      setEditingName(null)
      return
    }
    if (await onUpdate({ name })) setEditingName(null)
  }

  return (
    <Box
      ref={setNodeRef}
      component="section"
      aria-label={`${list.name}（${count}件）`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      sx={{
        // 画面幅に合わせて伸縮し、狭いときはボードが横スクロールする
        flex: '1 0 240px',
        maxWidth: 340,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
        bgcolor: list.color,
        borderRadius: 3,
        border: 2,
        borderColor: isOver && acceptsDrop ? 'primary.main' : 'transparent',
        // ドラッグ中のリストは元の場所に薄く残す(指に付いてくるのは DragOverlay)
        opacity: isDragging ? 0.4 : draggingCard && !acceptsDrop ? 0.5 : 1,
      }}
    >
      {/* 見出し。管理者・担当リーダーは、ここのどこをつかんでもリストを並べ替えられる */}
      <Stack
        onPointerDown={onPointerDown}
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: 'center',
          px: 1,
          pt: 1,
          pb: 0.75,
          cursor: draggable ? 'grab' : undefined,
          touchAction: draggable ? 'none' : undefined,
        }}
      >
        {editingName !== null ? (
          <TextField
            size="small"
            autoFocus
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName()
              if (e.key === 'Escape') setEditingName(null)
            }}
            slotProps={{ htmlInput: { maxLength: NAME_MAX_LENGTH, 'aria-label': 'リスト名' } }}
            sx={{ flexGrow: 1, bgcolor: 'background.paper', ml: 0.5 }}
          />
        ) : (
          <Typography
            variant="subtitle2"
            component="h2"
            noWrap
            title={list.name}
            // 左端をカードの文字とそろえる
            sx={{ fontWeight: 700, flexGrow: 1, minWidth: 0, pl: 1.5 }}
          >
            {canManage ? (
              // キーボードでも並べ替えられるよう、リスト名を選べるようにする
              // (Tab で選び、スペースキーで持ち上げ、矢印キーで移動、スペースキーで置く)
              // キーボード操作はキーを押した要素が持ち手(activator)である必要があるので、リスト名を持ち手にする
              // (マウスは見出し全体の onPointerDown で始まる)
              <Box
                component="span"
                ref={setActivatorNodeRef}
                {...attributes}
                onKeyDown={onKeyDown}
                aria-label={`${list.name}（ドラッグで並べ替え）`}
                sx={{
                  cursor: 'inherit',
                  borderRadius: 0.5,
                  '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: 2 },
                }}
              >
                {list.name}
              </Box>
            ) : (
              list.name
            )}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, px: 0.5 }}>
          {count}
        </Typography>
        {canAdd && (
          <Tooltip title={`${list.name}にタスクを追加`}>
            <IconButton size="small" aria-label={`${list.name}にタスクを追加`} onClick={onAdd}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {canManage && isCustom && (
          <>
            <Tooltip title="リストのメニュー">
              <IconButton
                size="small"
                aria-label={`${list.name}のメニュー`}
                onClick={(e) => setMenuAnchor(e.currentTarget)}
              >
                <MoreHorizIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={menuAnchor}
              open={menuAnchor !== null}
              onClose={() => setMenuAnchor(null)}
              // 「名前を変更」で開いた入力欄からフォーカスが外れないよう、閉じてもボタンに戻さない
              disableRestoreFocus
            >
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null)
                  setEditingName(list.name)
                }}
              >
                名前を変更
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setColorAnchor(menuAnchor)
                  setMenuAnchor(null)
                }}
              >
                色を変更
              </MenuItem>
              <Divider />
              <MenuItem
                disabled={list.task_count > 0}
                onClick={() => {
                  setMenuAnchor(null)
                  onDelete()
                }}
                sx={{ color: 'error.main' }}
              >
                <ListItemText
                  primary="リストを削除"
                  secondary={
                    list.task_count > 0 ? 'タスクが入っているため削除できません' : undefined
                  }
                />
              </MenuItem>
            </Menu>
            <Popover
              open={colorAnchor !== null}
              anchorEl={colorAnchor}
              onClose={() => setColorAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <Box sx={{ p: 1.5 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 1 }}
                >
                  リストの色
                </Typography>
                <ListColorPicker
                  value={list.color}
                  onChange={async (color) => {
                    if (await onUpdate({ color })) setColorAnchor(null)
                  }}
                />
              </Box>
            </Popover>
          </>
        )}
      </Stack>

      <Stack spacing={1} sx={{ px: 1, pb: 1, minHeight: 72, overflowY: 'auto', flexGrow: 1 }}>
        {children}
      </Stack>
    </Box>
  )
}

export default TaskColumn
