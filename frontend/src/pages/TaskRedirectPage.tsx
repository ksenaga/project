import { useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Container } from '@mui/material'
import { Link as RouterLink, useNavigate, useParams } from 'react-router'
import { fetchTaskLocation } from '../api/tasks'

// /tasks/:taskId … コメントの「#ID」などから開いたとき、そのタスクがあるプロジェクトの
// タスク一覧へ移動して詳細を開く
const TaskRedirectPage = () => {
  const taskId = Number(useParams().taskId)
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    fetchTaskLocation(taskId)
      .then((location) => {
        if (ignore) return
        navigate(`/projects/${location.project_id}/tasks?task=${location.id}`, { replace: true })
      })
      .catch((err: unknown) => !ignore && setError((err as Error).message))
    return () => {
      ignore = true
    }
  }, [taskId, navigate])

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      {error ? (
        <Alert
          severity="error"
          action={
            <Button component={RouterLink} to="/projects" color="inherit" size="small">
              プロジェクト一覧へ
            </Button>
          }
        >
          タスク #{taskId} を開けませんでした（{error}）
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
    </Container>
  )
}

export default TaskRedirectPage
