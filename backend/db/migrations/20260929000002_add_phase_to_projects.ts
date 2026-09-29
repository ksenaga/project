import type { Knex } from 'knex'

// projects にフェーズを追加する(企画/要件定義/設計/開発/テスト/リリース/保守/終了)
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('projects', (t) => {
    t.string('phase', 20).notNullable().defaultTo('企画')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('projects', (t) => {
    t.dropColumn('phase')
  })
}
