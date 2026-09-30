import type { Member } from '../api/users'

// コメントの「@ユーザー名」(メンション)。サーバー(backend の services/mention.ts)と同じルール
//   ・「@」(全角の「＠」も可)の直後にユーザー名が続くもの。名前が重なるときは長い名前を優先する
//   ・「@」の直前が英数字・_ のときは除く(メールアドレスなど)
//   ・名前の直後に英数字・_ が続くときは除く(「@user_1」と「@user_10」を区別するため)

const NAME_CHAR = /[A-Za-z0-9_]/
const MENTION_MARKS = ['@', '＠']

export type MentionPart = { type: 'text'; text: string } | { type: 'mention'; user: Member }

// 文章をメンションとそれ以外に分ける
export const splitMentions = (text: string, users: Member[]): MentionPart[] => {
  const byLongestName = [...users].sort((a, b) => b.name.length - a.name.length)
  const parts: MentionPart[] = []
  let last = 0
  for (let i = 0; i < text.length; i++) {
    if (!MENTION_MARKS.includes(text[i])) continue
    if (i > 0 && NAME_CHAR.test(text[i - 1])) continue
    const user = byLongestName.find(
      (u) => text.startsWith(u.name, i + 1) && !NAME_CHAR.test(text.charAt(i + 1 + u.name.length)),
    )
    if (!user) continue
    if (i > last) parts.push({ type: 'text', text: text.slice(last, i) })
    parts.push({ type: 'mention', user })
    last = i + 1 + user.name.length
    i = last - 1
  }
  if (last < text.length) parts.push({ type: 'text', text: text.slice(last) })
  return parts
}

// 入力中のメンション(カーソルの直前の「@〜」)。start は「@」の位置、query は「@」のあとに打った文字
export const mentionQueryAt = (
  value: string,
  caret: number,
): { start: number; query: string } | null => {
  const match = value.slice(0, caret).match(/(?:^|[^A-Za-z0-9_])[@＠]([^\s@＠]*)$/)
  if (!match) return null
  return { start: caret - match[1].length - 1, query: match[1] }
}
