import { Fragment, type ReactNode } from 'react'
import { Link } from '@mui/material'

// http:// / https:// で始まる部分を URL とみなす(空白・かっこ・日本語の句読点で区切る)
const URL_PATTERN = /https?:\/\/[^\s<>"'「」『』（）【】、。]+/g
// URL の直後に付きがちな記号は URL に含めない(例: 「…を参照(https://example.com).」)
const TRAILING_PUNCTUATION = /[.,;:!?)\]}]+$/

// 文章の中の URL をリンクにする(別タブで開く)
const LinkifiedText = ({ text }: { text: string }) => {
  const parts: ReactNode[] = []
  let last = 0

  for (const match of text.matchAll(URL_PATTERN)) {
    const url = match[0].replace(TRAILING_PUNCTUATION, '')
    const start = match.index
    if (start > last) parts.push(text.slice(last, start))
    parts.push(
      <Link
        key={start}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ wordBreak: 'break-all' }}
      >
        {url}
      </Link>,
    )
    last = start + url.length
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
