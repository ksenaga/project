import type { Knex } from 'knex'

// タスクに付けるタグ。tags にタグの一覧(意味・色付き)、task_tags にタスクとタグの対応を持つ
const TAGS = [
  {
    name: 'バグ',
    description: '想定と異なる動作・不具合',
    color: '#fee2e2',
    text_color: '#991b1b',
  },
  { name: '修正', description: '既存機能の修正・変更', color: '#ffedd5', text_color: '#9a3412' },
  {
    name: '要望',
    description: 'ユーザーからの機能追加・改善要望',
    color: '#ede9fe',
    text_color: '#5b21b6',
  },
  {
    name: '改善',
    description: '既存機能の使いやすさ・性能などの改善',
    color: '#ccfbf1',
    text_color: '#115e59',
  },
  { name: '新規', description: '新しい機能の追加', color: '#dbeafe', text_color: '#1e40af' },
  {
    name: '調査',
    description: '原因や仕様などを調査するチケット',
    color: '#e2e8f0',
    text_color: '#334155',
  },
  {
    name: '問い合わせ',
    description: '仕様確認・操作方法などの問い合わせ',
    color: '#e0f2fe',
    text_color: '#075985',
  },
  { name: '緊急', description: '緊急対応が必要なもの', color: '#dc2626', text_color: '#ffffff' },
]

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tags', (t) => {
    t.comment('タスクに付けるタグ')
    t.bigIncrements('id')
    t.string('name', 20).notNullable().unique().comment('タグ名')
    t.string('description', 255).notNullable().comment('タグの意味')
    t.string('color', 7).notNullable().comment('表示の背景色(#RRGGBB)')
    t.string('text_color', 7).notNullable().comment('表示の文字色(#RRGGBB)')
    t.integer('position').notNullable().comment('並び順')
  })
  await knex('tags').insert(TAGS.map((tag, i) => ({ ...tag, position: i + 1 })))

  await knex.schema.createTable('task_tags', (t) => {
    t.comment('タスクに付けたタグ(1つのタスクに複数付けられる)')
    t.bigInteger('task_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('tasks')
      .comment('タスク')
    t.bigInteger('tag_id').unsigned().notNullable().references('id').inTable('tags').comment('タグ')
    t.primary(['task_id', 'tag_id'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('task_tags')
  await knex.schema.dropTable('tags')
}
