import type { Knex } from 'knex'

// project_member(プロジェクトメンバー) 物理削除
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('project_member', (t) => {
    t.bigInteger('project_id').unsigned().notNullable().references('id').inTable('projects')
    t.bigInteger('user_id').unsigned().notNullable().references('id').inTable('users')
    t.bigInteger('creater').unsigned().notNullable().references('id').inTable('users')
    t.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3))
    t.primary(['project_id', 'user_id'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('project_member')
}
