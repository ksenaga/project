import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  IconButton,
  Skeleton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import TuneIcon from '@mui/icons-material/Tune'
import {
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Link as RouterLink, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { fetchProject, type ProjectDetail } from '../api/projects'
import { fetchScreens, type Screen } from '../api/screens'
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
import ScreenManageDialog from '../components/tasks/ScreenManageDialog'
import TaskCard, { TaskCardContent } from '../components/tasks/TaskCard'
import TaskColumn from '../components/tasks/TaskColumn'
import TaskDetailDialog from '../components/tasks/TaskDetailDialog'
import TaskFilterBar from '../components/tasks/TaskFilterBar'
import TaskFormDialog from '../components/tasks/TaskFormDialog'
import {
  CREATABLE_STATUSES,
  TASK_STATUS,
  TASK_STATUSES,
  type TaskStatus,
} from '../constants/taskStatus'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { formatDate } from '../utils/date'
import { canEditTask, canMoveTask } from '../utils/taskPermission'

type DialogState =
  | { type: 'detail'; taskId: number }
  | { type: 'create'; status: TaskStatus }
  | { type: 'copy'; task: Task }
  | { type: 'edit'; task: Task }
  | { type: 'delete'; task: Task }
  | { type: 'screens' }
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

const TaskBoardPage = () => {
  const projectId = Number(useParams().projectId)
  const { user, setUser } = useAuth()

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [tasks, setTasks] = useState<TaskSummary[] | null>(null)
  const [screens, setScreens] = useState<Screen[]>([])
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { keyboardCodes }),
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

  useEffect(() => {
    let ignore = false
    Promise.all([
      fetchProject(projectId),
      fetchTasks(projectId, { q, assigneeId, screenId, deadlineFrom, deadlineTo, deadlineColor }),
      fetchScreens(projectId),
    ])
      .then(([projectData, taskData, screenData]) => {
        if (ignore) return
        setProject(projectData)
        setTasks(taskData)
        setScreens(screenData)
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
    handleAuthError,
  ])

  if (!user) return null

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(tasks?.find((t) => t.id === active.id) ?? null)
  }

  // 列にドロップしたらステータスを変更する。先に画面を更新し、失敗したら元に戻す
  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveTask(null)
    const task = tasks?.find((t) => t.id === active.id)
    const status = over?.id as TaskStatus | undefined
    if (!task || !status || status === task.status) return
    if (!canMoveTask(user, task, status)) {
      setNotice({ message: `「${status}」には移動できません`, severity: 'error' })
      return
    }

    const previous = tasks
    setTasks((current) => current?.map((t) => (t.id === task.id ? { ...t, status } : t)) ?? null)
    try {
      await updateTask(projectId, task.id, { status })
      setNotice({ message: `「${task.title}」を${status}にしました`, severity: 'success' })
    } catch (err) {
      handleAuthError(err)
      setTasks(previous)
      setNotice({ message: (err as Error).message, severity: 'error' })
    }
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

      {/* ボード */}
      {!loadError && (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveTask(null)}
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
            {TASK_STATUSES.map((status) => {
              const columnTasks = tasks?.filter((t) => t.status === status) ?? []
              return (
                <TaskColumn
                  key={status}
                  status={status}
                  count={columnTasks.length}
                  acceptsDrop={
                    activeTask
                      ? status === activeTask.status || canMoveTask(user, activeTask, status)
                      : undefined
                  }
                  canAdd={project !== null && CREATABLE_STATUSES.includes(status)}
                  onAdd={() => setDialog({ type: 'create', status })}
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
          </Box>

          <DragOverlay dropAnimation={null}>
            {activeTask && (
              <Box sx={{ width: 256, cursor: 'grabbing' }}>
                <TaskCardContent task={activeTask} lifted />
              </Box>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* ダイアログ */}
      {dialog?.type === 'detail' && (
        <TaskDetailDialog
          user={user}
          projectId={projectId}
          taskId={dialog.taskId}
          onClose={() => setDialog(null)}
          onEdit={(task) => setDialog({ type: 'edit', task })}
          onDelete={(task) => setDialog({ type: 'delete', task })}
          onCopy={(task) => setDialog({ type: 'copy', task })}
        />
      )}
      {(dialog?.type === 'create' || dialog?.type === 'edit' || dialog?.type === 'copy') &&
        project && (
          <TaskFormDialog
            user={user}
            members={project.members}
            screens={screens}
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
