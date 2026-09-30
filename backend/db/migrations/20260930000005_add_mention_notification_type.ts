import type { Knex } from 'knex'

// 通知の種類に「メンション」を追加したので、列のコメントを更新する
const NOTIFICATION_TYPE = {
  before:
    '種類(project_member:メンバーに追加 / task_assignee:担当者になった / task_review:レビュー中になった / task_cancel_request:中止依頼 / task_comment:担当タスクへのコメント)',
  after:
    '種類(project_member:メンバーに追加 / task_assignee:担当者になった / task_review:レビュー中になった / task_cancel_request:中止依頼 / task_comment:担当タスクへのコメント / task_mention:コメントでのメンション)',
}

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('notifications', (t) => {
    t.string('type', 30).notNullable().comment(NOTIFICATION_TYPE.after).alter()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex('notifications').where({ type: 'task_mention' }).delete()
  await knex.schema.alterTable('notifications', (t) => {
    t.string('type', 30).notNullable().comment(NOTIFICATION_TYPE.before).alter()
  })
}
