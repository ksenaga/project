import type { Knex } from 'knex'

// ユーザーのアイコン画像。画像は別テーブルに持ち、users には更新日時だけ持つ
// (一覧などで users を読むときに画像のデータまで読まないように。更新日時は画像の URL に付けてキャッシュを切り替える)
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.datetime('avatar_updated_at', { precision: 3 })
      .nullable()
      .comment('アイコン画像を設定した日時(NULL なら画像なし)')
  })
  await knex.schema.createTable('user_avatars', (t) => {
    t.comment('ユーザーのアイコン画像')
    t.bigInteger('user_id')
      .unsigned()
      .primary()
      .references('id')
      .inTable('users')
      .comment('ユーザー')
    t.string('content_type', 30).notNullable().comment('画像の形式(image/png など)')
    t.specificType('data', 'mediumblob').notNullable().comment('画像のデータ')
    t.datetime('created_at', { precision: 3 })
      .notNullable()
      .defaultTo(knex.fn.now(3))
      .comment('設定した日時')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('user_avatars')
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('avatar_updated_at')
  })
}
