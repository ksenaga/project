import { useEffect, useState } from 'react'

// value の変化が delay ミリ秒止まってから、その値を返す(文字入力のたびに検索しないため)
export const useDebouncedValue = <T>(value: T, delay: number): T => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
