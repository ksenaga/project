import { Box, Chip, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material'
import type { Project } from '../api/projects'
import { PROJECT_PHASES, type ProjectPhase } from '../constants/projectPhase'

type Props = {
  project: Project
  // フェーズを変更できるか(管理者と、参画しているリーダー)
  canChangePhase: boolean
  onChangePhase: (phase: ProjectPhase) => void
}

// プロジェクトのフェーズと進捗度
// 進捗度 = 完了のタスク数 ÷ (未対応・対応中・レビュー中・完了のタスク数)。対応中止は含まない
const ProjectPhaseProgress = ({ project, canChangePhase, onChangePhase }: Props) => {
  const { done, total } = project.progress
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    // カードのクリック(タスク一覧へ移動)が反応しないようにする。プルダウンのメニューのクリックもここに届く
    <Stack
      direction="row"
      spacing={3}
      sx={{ alignItems: 'center', mt: 1.5 }}
      onClick={(e) => e.stopPropagation()}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
        <Typography variant="body2" color="text.secondary">
          フェーズ
        </Typography>
        {canChangePhase ? (
          <TextField
            select
            size="small"
            value={project.phase}
            onChange={(e) => onChangePhase(e.target.value as ProjectPhase)}
            sx={{ width: 140 }}
            slotProps={{ htmlInput: { 'aria-label': `${project.name}のフェーズ` } }}
          >
            {PROJECT_PHASES.map((phase) => (
              <MenuItem key={phase} value={phase}>
                {phase}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <Chip label={project.phase} size="small" color="primary" variant="outlined" />
        )}
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
          進捗度
        </Typography>
        {/* バーは最大 330px。狭いときは縮む */}
        <Box sx={{ flex: '0 1 330px', minWidth: 80 }}>
          <LinearProgress
            variant="determinate"
            value={percent}
            color={total > 0 && done === total ? 'success' : 'primary'}
            aria-label={`${project.name}の進捗度`}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, flexShrink: 0, minWidth: 44, textAlign: 'right' }}
        >
          {percent}%
        </Typography>
        {/* 件数が4桁(完了 9999 / 9999 件)でも折り返さない */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ flexShrink: 0, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
        >
          {total === 0 ? 'タスクなし' : `完了 ${done} / ${total} 件`}
        </Typography>
      </Stack>
    </Stack>
  )
}

export default ProjectPhaseProgress
