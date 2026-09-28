import type { Knex } from 'knex'

// tasks(タスク管理)
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tasks', (t) => {
    t.bigIncrements('id')
    t.bigInteger('project_id').unsigned().notNullable().references('id').inTable('projects')
    t.string('title', 50).notNullable()
    t.text('detail').notNullable()
    t.bigInteger('user_id').unsigned().notNullable().references('id').inTable('users') // 担当者
    t.string('status', 20).notNullable()
    t.string('screen', 255).nullable()
    t.datetime('deadline', { precision: 3 }).notNullable()
    t.text('modified').nullable()
    t.text('reason').nullable()
    t.string('git', 255).nullable()
    t.text('memo').nullable()
    t.bigInteger('creater').unsigned().notNullable().references('id').inTable('users')
    t.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3))
    t.bigInteger('updater').unsigned().nullable().references('id').inTable('users')
    t.datetime('updated_at', { precision: 3 }).nullable()
    t.datetime('deleted_at', { precision: 3 }).nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('tasks')
}
