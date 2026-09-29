import type { Knex } from 'knex'

// 画面上の通知
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notifications', (t) => {
    t.comment('ユーザーへの通知(画面上のベルに表示する)')
    t.bigIncrements('id')
    t.bigInteger('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .comment('通知を受け取るユーザー')
    t.string('type', 30)
      .notNullable()
      .comment(
        '種類(project_member:メンバーに追加 / task_assignee:担当者になった / task_review:レビュー中になった)',
      )
    t.bigInteger('project_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('projects')
      .comment('対象のプロジェクト')
    t.bigInteger('task_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('tasks')
      .comment('対象のタスク(プロジェクトの通知は NULL)')
    t.bigInteger('actor_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .comment('操作したユーザー')
    t.string('message', 255).notNullable().comment('表示する文章(通知したときの名前で作る)')
    t.datetime('read_at', { precision: 3 }).nullable().comment('既読にした日時(未読は NULL)')
    t.datetime('created_at', { precision: 3 })
      .notNullable()
      .defaultTo(knex.fn.now(3))
      .comment('通知した日時')
    t.index(['user_id', 'read_at'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('notifications')
}
