import type { Knex } from 'knex'

// users(ユーザ管理)
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (t) => {
    t.bigIncrements('id')
    t.string('name', 50).notNullable().unique()
    t.string('password', 255).notNullable() // bcrypt ハッシュ
    t.integer('role').notNullable() // 1:管理者 2:リーダー 3:一般ユーザー
    t.bigInteger('creater').unsigned().notNullable().references('id').inTable('users')
    t.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3))
    t.bigInteger('updater').unsigned().nullable().references('id').inTable('users')
    t.datetime('updated_at', { precision: 3 }).nullable()
    t.datetime('deleted_at', { precision: 3 }).nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users')
}
