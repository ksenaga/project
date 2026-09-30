import type { Knex } from 'knex'

// task_images(タスクの修正内容に貼る画像。原因となる画面のスクリーンショットなど)
//   ・貼った時点で保存し(task_id は NULL)、タスクを保存したときにタスクに付ける
//   ・タスクに付かないまま1日たった画像は、定期的に削除する
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('task_images', (t) => {
    t.comment('タスクの修正内容に貼る画像')
    t.bigIncrements('id')
    t.bigInteger('project_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('projects')
      .comment('プロジェクト')
    t.bigInteger('task_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('tasks')
      .comment('タスク(貼っただけで、まだタスクを保存していなければ NULL)')
    t.integer('position').unsigned().notNullable().defaultTo(0).comment('タスクの中での並び順')
    t.string('content_type', 30).notNullable().comment('画像の形式(image/png など)')
    t.specificType('data', 'mediumblob').notNullable().comment('画像のデータ')
    t.bigInteger('creater')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .comment('貼った人')
    t.datetime('created_at', { precision: 3 })
      .notNullable()
      .defaultTo(knex.fn.now(3))
      .comment('貼った日時')
    t.index(['task_id', 'position'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('task_images')
}
