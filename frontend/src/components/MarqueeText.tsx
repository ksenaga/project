import { useLayoutEffect, useRef, useState } from 'react'
import { Box, type SxProps, type Theme } from '@mui/material'
import { keyframes } from '@emotion/react'

// 元の位置から、1周分(タイトル＋すき間)だけ左へ動かす。
// 同じタイトルを2つ並べているので、繰り返しても途切れずに右から左へ流れ続ける
const flowLeft = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(calc(-1 * var(--marquee-loop))); }
`

// タイトルとタイトルのすき間(px)
const GAP = 40
// 流れる速さ(1秒あたりの px)
const SPEED = 25

type Props = {
  text: string
  sx?: SxProps<Theme>
}

// 1行で表示し、幅に入りきらないときだけ文字を右から左へ流す。
// 動きを減らす設定(prefers-reduced-motion)のときは流さず、末尾を「…」にする
const MarqueeText = ({ text, sx }: Props) => {
  const outerRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [textWidth, setTextWidth] = useState(0)
  const [overflowing, setOverflowing] = useState(false)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const textEl = textRef.current
    if (!outer || !textEl) return
    const measure = () => {
      setTextWidth(textEl.offsetWidth)
      setOverflowing(textEl.offsetWidth > outer.clientWidth)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(outer)
    observer.observe(textEl)
    return () => observer.disconnect()
  }, [text])

  const loop = textWidth + GAP
  const duration = loop / SPEED

  return (
    <Box
      ref={outerRef}
      component="span"
      title={text}
      sx={[
        {
          display: 'block',
          minWidth: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          '@media (prefers-reduced-motion: reduce)': { textOverflow: 'ellipsis' },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        component="span"
        style={{ ['--marquee-loop' as string]: `${loop}px` }}
        sx={{
          display: 'inline-block',
          ...(overflowing && {
            animation: `${flowLeft} ${duration}s linear infinite`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none', display: 'inline' },
          }),
        }}
      >
        <span ref={textRef}>{text}</span>
        {overflowing && (
          // 途切れずに流すための2つ目(読み上げでは重複させない)
          <Box
            component="span"
            aria-hidden
            sx={{
              pl: `${GAP}px`,
              '@media (prefers-reduced-motion: reduce)': { display: 'none' },
            }}
          >
            {text}
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default MarqueeText
