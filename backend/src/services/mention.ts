// コメントの「@ユーザー名」(メンション)を見つける。画面の表示(frontend の utils/mention.ts)と同じルール
//   ・「@」(全角の「＠」も可)の直後にユーザー名が続くもの。名前が重なるときは長い名前を優先する
//   ・「@」の直前が英数字・_ のときは除く(メールアドレスなど)
//   ・名前の直後に英数字・_ が続くときは除く(「@user_1」と「@user_10」を区別するため)

const NAME_CHAR = /[A-Za-z0-9_]/
const MENTION_MARKS = ['@', '＠']

export const findMentionedUsers = <T extends { id: number; name: string }>(
  body: string,
  users: T[],
): T[] => {
  const byLongestName = [...users].sort((a, b) => b.name.length - a.name.length)
  const found = new Map<number, T>()
  for (let i = 0; i < body.length; i++) {
    if (!MENTION_MARKS.includes(body[i])) continue
    if (i > 0 && NAME_CHAR.test(body[i - 1])) continue
    const user = byLongestName.find(
      (u) => body.startsWith(u.name, i + 1) && !NAME_CHAR.test(body.charAt(i + 1 + u.name.length)),
    )
    if (user) found.set(user.id, user)
  }
  return [...found.values()]
}
