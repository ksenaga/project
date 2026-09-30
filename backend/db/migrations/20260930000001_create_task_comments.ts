import type { Knex } from 'knex'

// タスクのコメント(やり取り)と、移動の自動コメント(ログの代わり)
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('task_comments', (t) => {
    t.comment('タスクのコメント(人が書いたコメントと、移動などの自動コメント)')
    t.bigIncrements('id')
    t.bigInteger('task_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('tasks')
      .comment('タスク')
    t.bigInteger('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .comment('書いた人(自動コメントは操作した人)')
    t.string('type', 20)
      .notNullable()
      .comment('種類(comment:人が書いたコメント / move:移動の自動コメント)')
    t.text('body').notNullable().comment('本文')
    t.datetime('created_at', { precision: 3 })
      .notNullable()
      .defaultTo(knex.fn.now(3))
      .comment('書いた日時')
    t.index(['task_id', 'created_at'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('task_comments')
}
