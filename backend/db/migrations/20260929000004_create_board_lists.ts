import type { Knex } from 'knex'

const DEFAULT_LISTS = ['未対応', '対応中', 'レビュー中', '完了', '対応中止']

// board_lists(ボードのリスト)を作る。
// 既存の5つ(status がそのステータス)と、追加したリスト(status が NULL)を、プロジェクトごとに並び順(position)付きで持つ。
// 追加したリストに入っているタスクは tasks.list_id でリストを表す(status は「対応中」にして未完了として扱う)
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('board_lists', (t) => {
    t.bigIncrements('id')
    t.bigInteger('project_id').unsigned().notNullable().references('id').inTable('projects')
    t.string('name', 50).notNullable()
    t.string('status', 20).nullable() // 既存の5つはステータス、追加したリストは NULL
    t.integer('position').notNullable()
    t.bigInteger('creater').unsigned().notNullable().references('id').inTable('users')
    t.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3))
    t.bigInteger('updater').unsigned().nullable().references('id').inTable('users')
    t.datetime('updated_at', { precision: 3 }).nullable()
    t.unique(['project_id', 'name']) // 同じプロジェクトに同じ名前のリストは作れない
  })

  // 既存のプロジェクトに、既存の5つのリストを作る
  const projects: { id: number; creater: number }[] = await knex('projects').select('id', 'creater')
  const rows = projects.flatMap((project) =>
    DEFAULT_LISTS.map((name, i) => ({
      project_id: project.id,
      name,
      status: name,
      position: i + 1,
      creater: project.creater,
    })),
  )
  if (rows.length > 0) await knex('board_lists').insert(rows)

  await knex.schema.alterTable('tasks', (t) => {
    t.bigInteger('list_id').unsigned().nullable().references('id').inTable('board_lists')
  })
}

export async function down(knex: Knex): Promise<void> {
  // 追加したリストのタスクは status が「対応中」なので、そのまま対応中の列に戻る
  await knex.schema.alterTable('tasks', (t) => {
    t.dropForeign(['list_id'])
    t.dropColumn('list_id')
  })
  await knex.schema.dropTable('board_lists')
}
