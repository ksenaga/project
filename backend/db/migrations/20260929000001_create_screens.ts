import type { Knex } from 'knex'

// screens(画面名管理)を作り、tasks.screen(自由入力)を tasks.screen_id(screens への参照)に置き換える
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('screens', (t) => {
    t.bigIncrements('id')
    t.bigInteger('project_id').unsigned().notNullable().references('id').inTable('projects')
    t.string('name', 50).notNullable()
    t.bigInteger('creater').unsigned().notNullable().references('id').inTable('users')
    t.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3))
    t.bigInteger('updater').unsigned().nullable().references('id').inTable('users')
    t.datetime('updated_at', { precision: 3 }).nullable()
    t.unique(['project_id', 'name']) // 同じプロジェクトに同じ画面名は登録できない
  })

  await knex.schema.alterTable('tasks', (t) => {
    t.bigInteger('screen_id').unsigned().nullable().references('id').inTable('screens')
  })

  // 入力済みの画面名を、プロジェクトごとに screens へ登録してから紐付ける
  await knex.raw(`
    INSERT INTO screens (project_id, name, creater)
    SELECT project_id, TRIM(screen), MIN(creater)
    FROM tasks
    WHERE screen IS NOT NULL AND TRIM(screen) <> ''
    GROUP BY project_id, TRIM(screen)
  `)
  await knex.raw(`
    UPDATE tasks t
    JOIN screens s ON s.project_id = t.project_id AND s.name = TRIM(t.screen)
    SET t.screen_id = s.id
  `)

  await knex.schema.alterTable('tasks', (t) => {
    t.dropColumn('screen')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tasks', (t) => {
    t.string('screen', 255).nullable()
  })
  await knex.raw(`
    UPDATE tasks t
    JOIN screens s ON s.id = t.screen_id
    SET t.screen = s.name
  `)
  await knex.schema.alterTable('tasks', (t) => {
    t.dropForeign(['screen_id'])
    t.dropColumn('screen_id')
  })
  await knex.schema.dropTable('screens')
}
