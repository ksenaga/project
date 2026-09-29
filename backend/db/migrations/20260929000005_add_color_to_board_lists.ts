import type { Knex } from 'knex'

// ボードのリストに背景色を追加する(明るめの色。既存の5つはステータスの色を明るくしたもの)
const FIXED_COLORS: Record<string, string> = {
  未対応: '#e2e8f0',
  対応中: '#dbeafe',
  レビュー中: '#fef3c7',
  完了: '#dcfce7',
  対応中止: '#fee2e2',
}

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('board_lists', (t) => {
    t.string('color', 7).notNullable().defaultTo('#f1f5f9')
  })
  for (const [status, color] of Object.entries(FIXED_COLORS)) {
    await knex('board_lists').where({ status }).update({ color })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('board_lists', (t) => {
    t.dropColumn('color')
  })
}
