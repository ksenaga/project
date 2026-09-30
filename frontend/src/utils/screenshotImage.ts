// スクリーンショットを送る前に縮める。文字が読めるよう、長い辺を MAX_SIDE まで(小さい画像はそのまま)
const MAX_SIDE = 2000
// 選べる元の画像の大きさの上限(縮めてから送るので、送る画像はずっと小さくなる)
const SOURCE_MAX_BYTES = 20 * 1024 * 1024

// 画像を WebP にする(ブラウザが WebP に書き出せないときは PNG になる)
export const toScreenshotImage = async (file: File): Promise<Blob> => {
  if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選んでください')
  if (file.size > SOURCE_MAX_BYTES) throw new Error('20MB 以下の画像にしてください')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('この画像は読み込めませんでした。PNG・JPEG・WebP の画像にしてください')
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')!
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.9),
  )
  if (!blob) throw new Error('画像を変換できませんでした')
  return blob
}

// 貼り付け・ドロップされたデータから画像ファイルだけを取り出す
export const imageFilesOf = (data: DataTransfer | null): File[] =>
  [...(data?.files ?? [])].filter((file) => file.type.startsWith('image/'))
