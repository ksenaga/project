import type { Knex } from 'knex'

// ログインに続けて失敗した回数と、ロックが解ける日時(5回続けて失敗すると一定時間ログインできない)
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.integer('failed_login_count')
      .unsigned()
      .notNullable()
      .defaultTo(0)
      .comment('ログインに続けて失敗した回数(成功・ロックで0に戻す)')
    t.datetime('locked_until', { precision: 3 })
      .nullable()
      .comment('この日時までログインできない(NULL ならロックしていない)')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('failed_login_count')
    t.dropColumn('locked_until')
  })
}
