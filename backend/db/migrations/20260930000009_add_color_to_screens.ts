import type { Knex } from 'knex'

// 画面名に色を付ける(タスクの画面名を色付きのラベルで表示する)。今ある画面名はグレー
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('screens', (t) => {
    t.string('color', 7).notNullable().defaultTo('#f1f5f9').comment('画面名の色(#RRGGBB。明るい色)')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('screens', (t) => {
    t.dropColumn('color')
  })
}
