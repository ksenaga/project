import type { Knex } from 'knex'

// projects(プロジェクト管理)
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('projects', (t) => {
    t.bigIncrements('id')
    t.string('name', 50).notNullable()
    t.text('detail').notNullable()
    t.datetime('deadline', { precision: 3 }).notNullable()
    t.bigInteger('creater').unsigned().notNullable().references('id').inTable('users')
    t.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3))
    t.bigInteger('updater').unsigned().nullable().references('id').inTable('users')
    t.datetime('updated_at', { precision: 3 }).nullable()
    t.datetime('deleted_at', { precision: 3 }).nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('projects')
}
