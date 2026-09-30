import type { Knex } from 'knex'

// project_logs(プロジェクトの変更履歴)。誰がいつ何を変えたかを残す(物理削除しない)
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('project_logs', (t) => {
    t.comment('プロジェクトの変更履歴')
    t.bigIncrements('id')
    t.bigInteger('project_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('projects')
      .comment('プロジェクト')
    t.bigInteger('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .comment('操作した人')
    t.string('type', 20)
      .notNullable()
      .comment('種類(create:作成 / change:名前・詳細・期限・メンバーの変更 / phase:フェーズの変更)')
    t.text('body').notNullable().comment('記録した文章(変更した項目を1行ずつ)')
    t.datetime('created_at', { precision: 3 })
      .notNullable()
      .defaultTo(knex.fn.now(3))
      .comment('操作した日時')
    t.index(['project_id', 'created_at'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('project_logs')
}
