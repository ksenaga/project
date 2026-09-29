import type { Knex } from 'knex'

// 通知の種類に「中止依頼」(task_cancel_request)を追加したので、type 列のコメントを更新する
const withCancel =
  '種類(project_member:メンバーに追加 / task_assignee:担当者になった / task_review:レビュー中になった / task_cancel_request:中止依頼)'
const withoutCancel =
  '種類(project_member:メンバーに追加 / task_assignee:担当者になった / task_review:レビュー中になった)'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('notifications', (t) => {
    t.string('type', 30).notNullable().comment(withCancel).alter()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex('notifications').where({ type: 'task_cancel_request' }).delete()
  await knex.schema.alterTable('notifications', (t) => {
    t.string('type', 30).notNullable().comment(withoutCancel).alter()
  })
}
