import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  IconButton,
  Skeleton,
  Snackbar,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined'
import TuneIcon from '@mui/icons-material/Tune'
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined'
import {
  closestCenter,
  defaultKeyboardCoordinateGetter,
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type KeyboardCoordinateGetter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { Link as RouterLink, useParams, useSearchParams } from 'react-router'
import {
  createBoardList,
  deleteBoardList,
  fetchBoardLists,
  reorderBoardLists,
  updateBoardList,
  type BoardList,
} from '../api/boardLists'
import { ApiError } from '../api/client'
import { fetchProject, type ProjectDetail } from '../api/projects'
import { fetchScreens, type Screen } from '../api/screens'
import { fetchTags, type Tag } from '../api/tags'
import {
  createTask,
  deleteTask,
  EMPTY_TASK_FILTER,
  fetchTasks,
  isFiltering,
  updateTask,
  type Task,
  type TaskFilter,
  type TaskInput,
  type TaskSummary,
} from '../api/tasks'
import { useAuth } from '../auth/AuthContext'
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog'
import MemberAvatars from '../components/MemberAvatars'
import AddListColumn from '../components/tasks/AddListColumn'
import ScreenManageDialog from '../components/tasks/ScreenManageDialog'
import TaskCard, { TaskCardContent } from '../components/tasks/TaskCard'
import TaskColumn from '../components/tasks/TaskColumn'
import TaskColumnPreview from '../components/tasks/TaskColumnPreview'
import TaskDetailDialog from '../components/tasks/TaskDetailDialog'
import TaskFilterBar from '../components/tasks/TaskFilterBar'
import TaskFormDialog from '../components/tasks/TaskFormDialog'
import TaskTable from '../components/tasks/TaskTable'
import { CARD_WIDTH } from '../constants/board'
import { ROLE } from '../constants/role'
import {
  CREATABLE_STATUSES,
  CUSTOM_LIST_STATUS,
  TASK_STATUS,
  type TaskStatus,
} from '../constants/taskStatus'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { formatDate } from '../utils/date'
import { canEditTask, canMoveTask, listDndId, listOfTask } from '../utils/taskPermission'

type DialogState =
  | { type: 'detail'; taskId: number }
  | { type: 'create'; status: TaskStatus }
  | { type: 'copy'; task: Task }
  | { type: 'edit'; task: Task }
  | { type: 'delete'; task: Task }
  | { type: 'screens' }
  | { type: 'deleteList'; list: BoardList }
  | null

type Notice = { message: string; severity: 'success' | 'error' }

// カードを持ち上げる操作: マウスは 5px 動かしたら(クリックと区別する)、キーボードはスペースキー
const keyboardCodes = {
  start: [KeyboardCode.Space],
  cancel: [KeyboardCode.Esc],
  end: [KeyboardCode.Space, KeyboardCode.Enter],
}

const screenReaderInstructions = {
  draggable:
    'スペースキーでカードを持ち上げ、矢印キーで列を移動し、スペースキーで置きます。Esc キーで取り消します。Enter キーで詳細を開きます。',
}

// キーボードで動かすとき、リストは矢印キー1回で隣のリストへ、カードは少しずつ動く
const keyboardCoordinates: KeyboardCoordinateGetter = (event, args) =>
  String(args.active).startsWith('list-')
    ? sortableKeyboardCoordinates(event, args)
    : defaultKeyboardCoordinateGetter(event, args)

// リストを並べ替えているときは近い列、カードを動かしているときは重なった列をドロップ先にする
const collisionDetection: CollisionDetection = (args) =>
  args.active.data.current?.type === 'list' ? closestCenter(args) : rectIntersection(args)

// 表示方法(ボード / リスト)。選んだ表示はブラウザに覚えておく
type ViewMode = 'board' | 'table'
const VIEW_MODE_KEY = 'taskViewMode'

const loadViewMode = (): ViewMode => {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === 'table' ? 'table' : 'board'
  } catch {
    return 'board'
  }
}

const saveViewMode = (mode: ViewMode) => {
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode)
  } catch {
    // 保存できなくても表示は切り替える
  }
}

const TaskBoardPage = () => {
  const projectId = Number(useParams().projectId)
  // 通知から開いたとき(?task=ID)は、そのタスクの詳細を開く
  const [searchParams, setSearchParams] = useSearchParams()
  const openTaskId = Number(searchParams.get('task')) || null
  const { user, setUser } = useAuth()

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [tasks, setTasks] = useState<(TaskSummary & Partial<Task>)[] | null>(null)
  const [screens, setScreens] = useState<Screen[]>([])
  const [lists, setLists] = useState<BoardList[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [filter, setFilter] = useState<TaskFilter>(EMPTY_TASK_FILTER)
  // 文字検索は入力が止まってから実行する
  const q = useDebouncedValue(filter.q, 300)
  const { assigneeId, screenId, deadlineFrom, deadlineTo, deadlineColor } = filter
  const appliedFilter = { q, assigneeId, screenId, deadlineFrom, deadlineTo, deadlineColor }
  const filtering = isFiltering(appliedFilter)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [activeTask, setActiveTask] = useState<TaskSummary | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode)
  // ドラッグしているリスト
  const [activeList, setActiveList] = useState<BoardList | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { keyboardCodes, coordinateGetter: keyboardCoordinates }),
  )

  // 401(ログイン切れ)ならログイン画面に戻す
  const handleAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) setUser(null)
    },
    [setUser],
  )

  // 値を増やすとプロジェクト・画面名・タスクを取り直す
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  // タグの一覧(全プロジェクト共通)
  useEffect(() => {
    let ignore = false
    fetchTags()
      .then((data) => !ignore && setTags(data))
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false
    Promise.all([
      fetchProject(projectId),
      fetchTasks(
        projectId,
        { q, assigneeId, screenId, deadlineFrom, deadlineTo, deadlineColor },
        // リスト表示では説明・メモなどの列も出せるよう、詳細の項目も取得する
        { withDetail: viewMode === 'table' },
      ),
      fetchScreens(projectId),
      fetchBoardLists(projectId),
    ])
      .then(([projectData, taskData, screenData, listData]) => {
        if (ignore) return
        setProject(projectData)
        setTasks(taskData)
        setScreens(screenData)
        setLists(listData)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (ignore) return
        handleAuthError(err)
        setLoadError(
          err instanceof ApiError && err.status === 403
            ? 'このプロジェクトのメンバーではないため、タスクを表示できません'
            : (err as Error).message,
        )
      })
    return () => {
      ignore = true
    }
  }, [
    projectId,
    reloadKey,
    q,
    assigneeId,
    screenId,
    deadlineFrom,
    deadlineTo,
    deadlineColor,
    viewMode,
    handleAuthError,
  ])

  if (!user) return null

  // 開いている詳細。URL の ?task=ID(通知から来たとき)も、ほかのダイアログが開いていなければ詳細として開く
  const detailTaskId =
    dialog?.type === 'detail' ? dialog.taskId : dialog === null ? openTaskId : null
  // 詳細から次の操作に進むときや閉じるときは、URL の ?task=ID を外す
  const changeDialog = (next: DialogState) => {
    if (openTaskId !== null) setSearchParams({}, { replace: true })
    setDialog(next)
  }

  // リストの追加・名前の変更・並べ替え・削除は、管理者と担当しているリーダーのみ
  const canManageLists =
    user.role === ROLE.ADMIN ||
    (user.role === ROLE.LEADER && (project?.members.some((m) => m.id === user.id) ?? false))

  const showError = (err: unknown) => {
    handleAuthError(err)
    setNotice({ message: (err as Error).message, severity: 'error' })
  }

  const handleDragStart = ({ active }: DragStartEvent) => {
    if (active.data.current?.type === 'list') {
      setActiveList(lists.find((l) => listDndId(l) === active.id) ?? null)
      return
    }
    setActiveTask(tasks?.find((t) => t.id === active.id) ?? null)
  }

  // リストを並べ替える。先に画面を更新し、失敗したら元に戻す
  const moveList = async (activeId: string, overId: string) => {
    const from = lists.findIndex((l) => listDndId(l) === activeId)
    const to = lists.findIndex((l) => listDndId(l) === overId)
    if (from < 0 || to < 0 || from === to) return
    const previous = lists
    const next = arrayMove(lists, from, to)
    setLists(next)
    try {
      setLists(
        await reorderBoardLists(
          projectId,
          next.map((l) => l.id),
        ),
      )
    } catch (err) {
      setLists(previous)
      showError(err)
    }
  }

  // カードをリストにドロップしたら移動する。先に画面を更新し、失敗したら元に戻す
  const moveTask = async (task: TaskSummary, target: BoardList) => {
    if (listOfTask(task, lists)?.id === target.id) return
    if (!canMoveTask(user, task, target)) {
      setNotice({ message: `「${target.name}」には移動できません`, severity: 'error' })
      return
    }
    // 既存の5つはステータス、追加したリストは list_id で表す
    const moved =
      target.status !== null
        ? { status: target.status, list_id: null }
        : { status: CUSTOM_LIST_STATUS, list_id: target.id }
    const previous = tasks
    setTasks((current) => current?.map((t) => (t.id === task.id ? { ...t, ...moved } : t)) ?? null)
    try {
      await updateTask(
        projectId,
        task.id,
        target.status !== null ? { status: target.status } : { list_id: target.id },
      )
      setNotice({ message: `「${task.title}」を${target.name}に移動しました`, severity: 'success' })
      reload()
    } catch (err) {
      setTasks(previous)
      showError(err)
    }
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null)
    setActiveList(null)
    if (!over) return
    if (active.data.current?.type === 'list') {
      moveList(String(active.id), String(over.id))
      return
    }
    const task = tasks?.find((t) => t.id === active.id)
    const target = lists.find((l) => listDndId(l) === over.id)
    if (task && target) moveTask(task, target)
  }

  const handleAddList = async (name: string, color: string) => {
    try {
      const list = await createBoardList(projectId, name, color)
      setLists((current) => [...current, list])
      return true
    } catch (err) {
      showError(err)
      return false
    }
  }

  const handleUpdateList = async (list: BoardList, fields: { name?: string; color?: string }) => {
    try {
      const updated = await updateBoardList(projectId, list.id, fields)
      setLists((current) => current.map((l) => (l.id === updated.id ? updated : l)))
      return true
    } catch (err) {
      showError(err)
      return false
    }
  }

  const handleDeleteList = async () => {
    if (dialog?.type !== 'deleteList') return
    try {
      await deleteBoardList(projectId, dialog.list.id)
    } catch (err) {
      handleAuthError(err)
      throw err
    }
    setDialog(null)
    setNotice({ message: 'リストを削除しました', severity: 'success' })
    reload()
  }

  const handleSubmit = async (input: Partial<TaskInput>) => {
    try {
      if (dialog?.type === 'edit') {
        await updateTask(projectId, dialog.task.id, input)
        setNotice({ message: 'タスクを更新しました', severity: 'success' })
      } else {
        await createTask(projectId, input as TaskInput)
        setNotice({
          message:
            dialog?.type === 'copy' ? 'タスクのコピーを作成しました' : 'タスクを作成しました',
          severity: 'success',
        })
      }
    } catch (err) {
      handleAuthError(err)
      throw err
    }
    setDialog(null)
    reload()
  }

  const handleDelete = async () => {
    if (dialog?.type !== 'delete') return
    try {
      await deleteTask(projectId, dialog.task.id)
    } catch (err) {
      handleAuthError(err)
      throw err
    }
    setDialog(null)
    setNotice({ message: 'タスクを削除しました', severity: 'success' })
    reload()
  }

  return (
    <Box
      sx={{
        px: 3,
        pt: 3,
        pb: 2,
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
      }}
    >
      {/* ヘッダー */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
        <Tooltip title="プロジェクト一覧へ戻る">
          <IconButton component={RouterLink} to="/projects" aria-label="プロジェクト一覧へ戻る">
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="h5" component="h1" noWrap sx={{ fontWeight: 700 }}>
            {project ? project.name : <Skeleton width={240} />}
          </Typography>
          {project && (
            <Stack
              direction="row"
              spacing={2}
              sx={{ alignItems: 'center', color: 'text.secondary' }}
            >
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <EventOutlinedIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2">期限 {formatDate(project.deadline)}</Typography>
              </Stack>
              {tasks && !filtering && (
                <Typography variant="body2">タスク {tasks.length} 件</Typography>
              )}
            </Stack>
          )}
        </Box>
        {project && (
          <Box sx={{ width: 220, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
            <MemberAvatars members={project.members} size={30} />
          </Box>
        )}
        {project && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={viewMode}
            onChange={(_e, mode: ViewMode | null) => {
              if (!mode) return
              setViewMode(mode)
              saveViewMode(mode)
            }}
            aria-label="表示の切り替え"
            sx={{ flexShrink: 0, bgcolor: 'background.paper' }}
          >
            <ToggleButton value="board" aria-label="ボード表示" sx={{ px: 1.5, gap: 0.75 }}>
              <ViewKanbanOutlinedIcon fontSize="small" />
              ボード
            </ToggleButton>
            <ToggleButton value="table" aria-label="リスト表示" sx={{ px: 1.5, gap: 0.75 }}>
              <TableRowsOutlinedIcon fontSize="small" />
              リスト
            </ToggleButton>
          </ToggleButtonGroup>
        )}
        {project && (
          <Button
            variant="outlined"
            startIcon={<TuneIcon />}
            onClick={() => setDialog({ type: 'screens' })}
            sx={{ flexShrink: 0, bgcolor: 'background.paper' }}
          >
            画面名の管理
          </Button>
        )}
      </Stack>

      {project && (
        <TaskFilterBar
          filter={filter}
          onChange={setFilter}
          members={project.members}
          screens={screens}
          resultCount={filtering && tasks ? tasks.length : null}
        />
      )}

      {filtering && tasks?.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          条件に一致するタスクはありません
        </Alert>
      )}

      {loadError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={reload}>
              再読み込み
            </Button>
          }
        >
          {loadError}
        </Alert>
      )}

      {/* リスト表示(1行に1タスク) */}
      {!loadError && viewMode === 'table' && tasks && (
        <TaskTable
          tasks={tasks}
          lists={lists}
          onOpen={(task) => setDialog({ type: 'detail', taskId: task.id })}
        />
      )}

      {/* ボード */}
      {!loadError && viewMode === 'board' && (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          // 端に近づいたときだけボードを自動でスクロールする(右側の列をつかんだ瞬間にスクロールしないように)
          autoScroll={{ threshold: { x: 0.08, y: 0.15 } }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            setActiveTask(null)
            setActiveList(null)
          }}
          accessibility={{ screenReaderInstructions }}
        >
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start',
              overflowX: 'auto',
              flexGrow: 1,
              minHeight: 0,
              pb: 1,
            }}
          >
            <SortableContext items={lists.map(listDndId)} strategy={horizontalListSortingStrategy}>
              {lists.map((list) => {
                const columnTasks = tasks?.filter((t) => listOfTask(t, lists)?.id === list.id) ?? []
                return (
                  <TaskColumn
                    key={list.id}
                    list={list}
                    count={columnTasks.length}
                    acceptsDrop={
                      activeTask
                        ? listOfTask(activeTask, lists)?.id === list.id ||
                          canMoveTask(user, activeTask, list)
                        : undefined
                    }
                    canAdd={
                      project !== null &&
                      list.status !== null &&
                      CREATABLE_STATUSES.includes(list.status)
                    }
                    onAdd={() => list.status && setDialog({ type: 'create', status: list.status })}
                    canManage={canManageLists}
                    onUpdate={(fields) => handleUpdateList(list, fields)}
                    onDelete={() => setDialog({ type: 'deleteList', list })}
                  >
                    {tasks === null &&
                      [0, 1].map((i) => <Skeleton key={i} variant="rounded" height={72} />)}
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        draggable={canEditTask(user, task)}
                        onOpen={() => setDialog({ type: 'detail', taskId: task.id })}
                      />
                    ))}
                  </TaskColumn>
                )
              })}
            </SortableContext>
            {canManageLists && project && <AddListColumn onAdd={handleAddList} />}
          </Box>

          <DragOverlay dropAnimation={null}>
            {activeTask && (
              <Box sx={{ width: CARD_WIDTH, cursor: 'grabbing' }}>
                <TaskCardContent task={activeTask} lifted />
              </Box>
            )}
            {activeList && (
              <TaskColumnPreview
                list={activeList}
                count={tasks?.filter((t) => listOfTask(t, lists)?.id === activeList.id).length ?? 0}
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* ダイアログ */}
      {detailTaskId !== null && (
        <TaskDetailDialog
          key={detailTaskId}
          user={user}
          projectId={projectId}
          taskId={detailTaskId}
          lists={lists}
          tags={tags}
          onClose={() => changeDialog(null)}
          onEdit={(task) => changeDialog({ type: 'edit', task })}
          onDelete={(task) => changeDialog({ type: 'delete', task })}
          onCopy={(task) => changeDialog({ type: 'copy', task })}
        />
      )}
      {(dialog?.type === 'create' || dialog?.type === 'edit' || dialog?.type === 'copy') &&
        project && (
          <TaskFormDialog
            user={user}
            members={project.members}
            screens={screens}
            lists={lists}
            tags={tags}
            task={dialog.type === 'edit' ? dialog.task : undefined}
            copyFrom={dialog.type === 'copy' ? dialog.task : undefined}
            defaultStatus={dialog.type === 'create' ? dialog.status : TASK_STATUS.TODO}
            onClose={() => setDialog(null)}
            onSubmit={handleSubmit}
          />
        )}
      {dialog?.type === 'screens' && (
        <ScreenManageDialog
          projectId={projectId}
          onClose={() => setDialog(null)}
          onChanged={reload}
        />
      )}
      {dialog?.type === 'deleteList' && (
        <ConfirmDeleteDialog
          title="リストを削除"
          message={`リスト「${dialog.list.name}」を削除しますか？`}
          onClose={() => setDialog(null)}
          onConfirm={handleDeleteList}
        />
      )}
      {dialog?.type === 'delete' && (
        <ConfirmDeleteDialog
          title="タスクを削除"
          message={`「${dialog.task.title}」を削除しますか？`}
          onClose={() => setDialog(null)}
          onConfirm={handleDelete}
        />
      )}

      <Snackbar
        open={notice !== null}
        autoHideDuration={3000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notice ? (
          <Alert severity={notice.severity} variant="filled" onClose={() => setNotice(null)}>
            {notice.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  )
}

export default TaskBoardPage
