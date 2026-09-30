// アイコン画像の大きさ(px)。表示は最大でも 72px 程度なので、高精細な画面でも十分な大きさにする
const AVATAR_SIZE = 256
// 選べる元の画像の大きさの上限(縮めてから送るので、送る画像はずっと小さくなる)
const SOURCE_MAX_BYTES = 10 * 1024 * 1024

// 選んだ画像を、中央で正方形に切り抜いて AVATAR_SIZE に縮める。
// WebP にする(ブラウザが WebP に書き出せないときは PNG になる)
export const toAvatarImage = async (file: File): Promise<Blob> => {
  if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選んでください')
  if (file.size > SOURCE_MAX_BYTES) throw new Error('10MB 以下の画像を選んでください')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('この画像は読み込めませんでした。PNG・JPEG・WebP の画像を選んでください')
  }
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const context = canvas.getContext('2d')!
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  )
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.9),
  )
  if (!blob) throw new Error('画像を変換できませんでした')
  return blob
}
