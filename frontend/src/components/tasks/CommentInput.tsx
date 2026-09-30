import { useLayoutEffect, useRef, useState } from 'react'
import { Box, ListItemButton, Paper, TextField, Typography } from '@mui/material'
import type { Member } from '../../api/users'
import { mentionQueryAt } from '../../utils/mention'
import UserAvatar from '../UserAvatar'

const BODY_MAX_LENGTH = 2000
// 候補は多くても見やすい数だけ出す
const MAX_CANDIDATES = 8

type Props = {
  value: string
  onChange: (value: string) => void
  // Ctrl + Enter(Mac は ⌘ + Enter)で送信する
  onSubmit: () => void
  disabled: boolean
  // メンションの候補(自分は除いて渡す)
  candidates: Member[]
}

// コメントの入力欄。「@」を打つとメンションの候補を出し、選ぶと「@ユーザー名 」を入れる
const CommentInput = ({ value, onChange, onSubmit, disabled, candidates }: Props) => {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // 入力中のメンション(null なら候補を出さない)
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null)
  const [active, setActive] = useState(0)
  // 候補を選んだあとに置くカーソルの位置。値が画面に反映された直後(次の入力より前)に置く
  const pendingCaret = useRef<number | null>(null)
  useLayoutEffect(() => {
    const el = inputRef.current
    if (el && pendingCaret.current !== null) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current)
      pendingCaret.current = null
    }
  }, [value])

  const query = mention?.query.toLowerCase() ?? ''
  // 名前が打った文字で始まる人を先に、含む人をあとに並べる
  const matches = mention
    ? [
        ...candidates.filter((c) => c.name.toLowerCase().startsWith(query)),
        ...candidates.filter(
          (c) => !c.name.toLowerCase().startsWith(query) && c.name.toLowerCase().includes(query),
        ),
      ].slice(0, MAX_CANDIDATES)
    : []
  const open = matches.length > 0

  // カーソルの位置から、入力中のメンションを調べ直す
  const detect = (el: HTMLTextAreaElement) => {
    const next =
      el.selectionStart === el.selectionEnd ? mentionQueryAt(el.value, el.selectionStart) : null
    setMention(next)
    if (next?.query !== mention?.query) setActive(0)
  }

  const select = (user: Member) => {
    const el = inputRef.current
    if (!el || !mention) return
    const caret = el.selectionStart
    const inserted = `@${user.name} `
    // 入れた名前のうしろにカーソルを置く
    pendingCaret.current = mention.start + inserted.length
    onChange(value.slice(0, mention.start) + inserted + value.slice(caret))
    setMention(null)
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {open && (
        // 入力欄の上に出す(コメント欄の下のほうにあるため)
        <Paper
          role="listbox"
          aria-label="メンションする人"
          elevation={6}
          sx={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            mb: 0.5,
            py: 0.5,
            zIndex: 1,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {matches.map((user, i) => (
            <ListItemButton
              key={user.id}
              role="option"
              aria-selected={i === active}
              selected={i === active}
              dense
              // 入力欄のフォーカスを外さない
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => select(user)}
              sx={{ gap: 1 }}
            >
              <UserAvatar user={user} size={24} />
              <Typography variant="body2">{user.name}</Typography>
            </ListItemButton>
          ))}
        </Paper>
      )}
      <TextField
        multiline
        size="small"
        minRows={1}
        maxRows={6}
        fullWidth
        placeholder="コメントを入力（@ でメンション）"
        title="Ctrl + Enter でも送信できます"
        value={value}
        inputRef={inputRef}
        onChange={(e) => {
          onChange(e.target.value)
          detect(e.target as HTMLTextAreaElement)
        }}
        // カーソルを動かしたとき(矢印キー・クリック)も調べ直す
        onSelect={(e) => detect(e.target as HTMLTextAreaElement)}
        onBlur={() => setMention(null)}
        onKeyDown={(e) => {
          // 日本語の変換を確定する Enter では選ばない
          if (open && !e.nativeEvent.isComposing) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              const step = e.key === 'ArrowDown' ? 1 : -1
              setActive((i) => (i + step + matches.length) % matches.length)
              return
            }
            if ((e.key === 'Enter' && !e.ctrlKey && !e.metaKey) || e.key === 'Tab') {
              e.preventDefault()
              select(matches[active] ?? matches[0])
              return
            }
            if (e.key === 'Escape') {
              // 候補だけを閉じる(詳細のモーダルは閉じない)
              e.preventDefault()
              e.stopPropagation()
              setMention(null)
              return
            }
          }
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            onSubmit()
          }
        }}
        disabled={disabled}
        slotProps={{
          htmlInput: {
            maxLength: BODY_MAX_LENGTH,
            'aria-label': 'コメント',
            'aria-expanded': open,
            'aria-autocomplete': 'list',
          },
        }}
      />
    </Box>
  )
}

export default CommentInput
