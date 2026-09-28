import type { Knex } from 'knex'
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

// 初期管理者 (name: admin / password: admin)
export async function seed(knex: Knex): Promise<void> {
  const password = await bcrypt.hash('admin', SALT_ROUNDS)

  // 何度実行しても重複しないよう、既に admin がいれば何もしない
  // creater は自分自身(id=1)を指す
  await knex('users')
    .insert({ id: 1, name: 'admin', password, role: 1, creater: 1 })
    .onConflict('name')
    .ignore()
}
