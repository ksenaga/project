import type { Knex } from 'knex'

// タスクの担当者を複数にする。
// task_assignees(タスクと担当者の対応)を作り、tasks.user_id の担当者を移してから user_id を削除する
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('task_assignees', (t) => {
    t.bigInteger('task_id').unsigned().notNullable().references('id').inTable('tasks')
    t.bigInteger('user_id').unsigned().notNullable().references('id').inTable('users')
    t.primary(['task_id', 'user_id'])
  })

  await knex.raw('INSERT INTO task_assignees (task_id, user_id) SELECT id, user_id FROM tasks')

  await knex.schema.alterTable('tasks', (t) => {
    t.dropForeign(['user_id'])
    t.dropColumn('user_id')
  })
}

// 元に戻すときは、担当者のうち ID が一番小さい人を tasks.user_id にする
export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tasks', (t) => {
    t.bigInteger('user_id').unsigned().nullable()
  })
  await knex.raw(`
    UPDATE tasks t
    JOIN (SELECT task_id, MIN(user_id) AS user_id FROM task_assignees GROUP BY task_id) a
      ON a.task_id = t.id
    SET t.user_id = a.user_id
  `)
  // 担当者がいないタスクは作成者を担当者にする(user_id は必須のため)
  await knex.raw('UPDATE tasks SET user_id = creater WHERE user_id IS NULL')
  await knex.schema.alterTable('tasks', (t) => {
    t.bigInteger('user_id').unsigned().notNullable().alter()
    t.foreign('user_id').references('id').inTable('users')
  })
  await knex.schema.dropTable('task_assignees')
}
