import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  Link,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import { Link as RouterLink, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import {
  createProject,
  deleteProject,
  fetchProjects,
  updateProject,
  type Project,
  type ProjectInput,
} from '../api/projects'
import { useAuth } from '../auth/AuthContext'
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog'
import DeadlineChip from '../components/DeadlineChip'
import MemberAvatars from '../components/MemberAvatars'
import ProjectFormDialog from '../components/ProjectFormDialog'
import { ROLE } from '../constants/role'
import { formatDate } from '../utils/date'

type FormTarget = { mode: 'create' } | { mode: 'edit'; project: Project }

const ProjectPage = () => {
  const { user, setUser } = useAuth()
  const isAdmin = user?.role === ROLE.ADMIN
  const navigate = useNavigate()

  // 管理者は全プロジェクト、それ以外はメンバーになっているプロジェクトだけタスク一覧を開ける
  const canOpenTasks = (project: Project) =>
    isAdmin || project.members.some((member) => member.id === user?.id)

  const [projects, setProjects] = useState<Project[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // 401(ログイン切れ)ならログイン画面に戻す
  const handleAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) setUser(null)
    },
    [setUser],
  )

  // 値を増やすと一覧を取り直す
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    let ignore = false // 画面を離れた後や再取得が重なったときに古い結果を捨てる
    fetchProjects()
      .then((data) => {
        if (ignore) return
        setProjects(data)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (ignore) return
        handleAuthError(err)
        setLoadError((err as Error).message)
      })
    return () => {
      ignore = true
    }
  }, [reloadKey, handleAuthError])

  const handleSubmit = async (input: ProjectInput) => {
    try {
      if (formTarget?.mode === 'edit') {
        await updateProject(formTarget.project.id, input)
        setNotice('プロジェクトを更新しました')
      } else {
        await createProject(input)
        setNotice('プロジェクトを作成しました')
      }
    } catch (err) {
      handleAuthError(err)
      throw err
    }
    setFormTarget(null)
    reload()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteProject(deleteTarget.id)
    } catch (err) {
      handleAuthError(err)
      throw err
    }
    setDeleteTarget(null)
    setNotice('プロジェクトを削除しました')
    reload()
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 3 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            プロジェクト一覧
          </Typography>
          {projects && (
            <Typography variant="body2" color="text.secondary">
              {projects.length} 件
            </Typography>
          )}
        </Box>
        {isAdmin && (
          <Tooltip title="プロジェクトを作成">
            <IconButton
              aria-label="プロジェクトを作成"
              onClick={() => setFormTarget({ mode: 'create' })}
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {loadError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={reload}>
              再読み込み
            </Button>
          }
          sx={{ mb: 2 }}
        >
          {loadError}
        </Alert>
      )}

      {projects === null && !loadError && (
        <Stack spacing={2}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={140} />
          ))}
        </Stack>
      )}

      {projects?.length === 0 && (
        <Paper
          variant="outlined"
          sx={{ p: 6, textAlign: 'center', color: 'text.secondary', borderStyle: 'dashed' }}
        >
          <FolderOpenOutlinedIcon sx={{ fontSize: 48, mb: 1 }} />
          <Typography sx={{ fontWeight: 600 }}>プロジェクトはまだありません</Typography>
          {isAdmin && <Typography variant="body2">右上の ＋ から作成できます</Typography>}
        </Paper>
      )}

      {projects && projects.length > 0 && (
        <Stack spacing={2}>
          {projects.map((project) => {
            const openable = canOpenTasks(project)
            const tasksPath = `/projects/${project.id}/tasks`
            return (
              <Paper
                key={project.id}
                variant="outlined"
                onClick={openable ? () => navigate(tasksPath) : undefined}
                sx={{
                  p: 3,
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  ...(openable && {
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: '0 4px 16px -8px rgba(79, 70, 229, 0.4)',
                    },
                  }),
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                  <Typography
                    variant="h6"
                    component="h2"
                    sx={{ fontWeight: 700, flexGrow: 1, wordBreak: 'break-word' }}
                  >
                    {openable ? (
                      // キーボード操作でも開けるようにリンクにする
                      <Link
                        component={RouterLink}
                        to={tasksPath}
                        color="inherit"
                        underline="hover"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {project.name}
                      </Link>
                    ) : (
                      project.name
                    )}
                  </Typography>
                  {isAdmin && (
                    <Stack
                      direction="row"
                      sx={{ mt: -0.5, mr: -1 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Tooltip title="編集">
                        <IconButton
                          aria-label={`${project.name}を編集`}
                          onClick={() => setFormTarget({ mode: 'edit', project })}
                        >
                          <EditOutlinedIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="削除">
                        <IconButton
                          aria-label={`${project.name}を削除`}
                          onClick={() => setDeleteTarget(project)}
                        >
                          <DeleteOutlinedIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}
                </Stack>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  {project.detail}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 2 }}>
                  <EventOutlinedIcon fontSize="small" color="action" />
                  <Typography variant="body2">期限 {formatDate(project.deadline)}</Typography>
                  <DeadlineChip deadline={project.deadline} />
                </Stack>

                <Box sx={{ mt: 1.5 }}>
                  <MemberAvatars members={project.members} />
                </Box>
              </Paper>
            )
          })}
        </Stack>
      )}

      {formTarget && (
        <ProjectFormDialog
          project={formTarget.mode === 'edit' ? formTarget.project : undefined}
          onClose={() => setFormTarget(null)}
          onSubmit={handleSubmit}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          title="プロジェクトを削除"
          message={`「${deleteTarget.name}」を削除しますか？`}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      <Snackbar
        open={notice !== null}
        autoHideDuration={3000}
        onClose={() => setNotice(null)}
        message={notice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  )
}

export default ProjectPage
