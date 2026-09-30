import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { Link } from '@mui/material'
import { fetchTaskLocation } from '../api/tasks'
import { taskLink } from '../utils/taskLink'

// リンクにする部分
//   1. http:// / https:// で始まる URL(空白・かっこ・日本語の句読点で区切る)
//   2. 「#123」のようなタスク ID(直前が英数字・/・& のときは除く。URL の #以降や文字参照と区別するため)
const LINK_PATTERN = /(https?:\/\/[^\s<>"'「」『』（）【】、。]+)|(?<![\w/&#])#(\d+)(?!\w)/g
// URL の直後に付きがちな記号は URL に含めない(例: 「…を参照(https://example.com).」)
const TRAILING_PUNCTUATION = /[.,;:!?)\]}]+$/

// このシステムのタスクの URL なら、そのタスク ID を返す
//   /tasks/12 と /projects/3/tasks?task=12 の2つの形
const taskIdOfUrl = (url: string) => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.origin !== window.location.origin) return null
  const direct = parsed.pathname.match(/^\/tasks\/(\d+)\/?$/)
  if (direct) return Number(direct[1])
  const task = parsed.searchParams.get('task')
  if (/^\/projects\/\d+\/tasks\/?$/.test(parsed.pathname) && task && /^\d+$/.test(task))
    return Number(task)
  return null
}

// タスク名は一度調べたら使い回す(同じタスクへのリンクが何度出てきても1回だけ取得する)。
// 見られないタスク・存在しないタスクは null
const titleCache = new Map<number, Promise<string | null>>()
const fetchTitle = (id: number) => {
  let title = titleCache.get(id)
  if (!title) {
    title = fetchTaskLocation(id).then(
      (location) => location.title,
      () => null,
    )
    titleCache.set(id, title)
  }
  return title
}

// タスクへのリンク。タスク名が分かればタスク名を、分からなければ書かれたまま(URL や #ID)を表示する
const TaskLink = ({ id, fallback }: { id: number; fallback: string }) => {
  const [title, setTitle] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    fetchTitle(id).then((value) => !ignore && setTitle(value))
    return () => {
      ignore = true
    }
  }, [id])

  return (
    <Link
      href={taskLink(id)}
      target="_blank"
      rel="noopener noreferrer"
      underline="none"
      title={`タスク #${id} を別タブで開く`}
      sx={{ wordBreak: 'break-all', fontWeight: 600 }}
    >
      {title ?? fallback}
    </Link>
  )
}

// 文章の中の URL と「#タスクID」をリンクにする(別タブで開く。下線は付けず、色で見分ける)。
// このシステムのタスクへのリンクは、URL の代わりにタスク名を表示する
const LinkifiedText = ({ text }: { text: string }) => {
  const parts: ReactNode[] = []
  let last = 0

  for (const match of text.matchAll(LINK_PATTERN)) {
    const start = match.index
    const [raw, url, taskIdText] = match
    const label = url ? url.replace(TRAILING_PUNCTUATION, '') : raw
    const taskId = url ? taskIdOfUrl(label) : Number(taskIdText)
    if (start > last) parts.push(text.slice(last, start))
    parts.push(
      taskId !== null ? (
        <TaskLink key={start} id={taskId} fallback={label} />
      ) : (
        <Link
          key={start}
          href={label}
          target="_blank"
          rel="noopener noreferrer"
          underline="none"
          sx={{ wordBreak: 'break-all' }}
        >
          {label}
        </Link>
      ),
    )
    last = start + label.length
  }
  if (last < text.length) parts.push(text.slice(last))

  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </>
  )
}

export default LinkifiedText
