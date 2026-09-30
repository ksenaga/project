import { useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import HistoryIcon from '@mui/icons-material/History'
import { fetchProjectLogs, type ProjectLog } from '../api/projects'
import { timeAgo } from '../utils/date'
import UserAvatar from './UserAvatar'

// プロジェクトの変更履歴(新しい順)。開いたときに読み込む
const ProjectHistory = ({ projectId }: { projectId: number }) => {
  const [logs, setLogs] = useState<ProjectLog[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    if (logs !== null) return
    setError(null)
    fetchProjectLogs(projectId)
      .then(setLogs)
      .catch((err: unknown) => setError((err as Error).message))
  }

  return (
    <Accordion
      disableGutters
      elevation={0}
      onChange={(_e, expanded) => expanded && load()}
      sx={{ border: 1, borderColor: 'divider', borderRadius: 1, '&::before': { display: 'none' } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <HistoryIcon fontSize="small" color="action" />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            変更履歴
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, maxHeight: 320, overflowY: 'auto' }}>
        {error && <Alert severity="error">{error}</Alert>}
        {logs === null && !error && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        )}
        {logs?.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            まだ履歴はありません
          </Typography>
        )}
        <Stack spacing={1.5}>
          {logs?.map((log) => (
            <Stack key={log.id} direction="row" spacing={1.25}>
              <UserAvatar user={log.user} size={24} />
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {log.user.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    title={new Date(log.created_at).toLocaleString('ja-JP')}
                  >
                    {timeAgo(log.created_at)}
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  {log.body}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  )
}

export default ProjectHistory
