import type { Knex } from 'knex'

// 通知の種類に「コメント」、コメントの種類に「作成」「変更」(変更履歴)を追加したので、列のコメントを更新する
const NOTIFICATION_TYPE = {
  before:
    '種類(project_member:メンバーに追加 / task_assignee:担当者になった / task_review:レビュー中になった / task_cancel_request:中止依頼)',
  after:
    '種類(project_member:メンバーに追加 / task_assignee:担当者になった / task_review:レビュー中になった / task_cancel_request:中止依頼 / task_comment:担当タスクへのコメント)',
}
const COMMENT_TYPE = {
  before: '種類(comment:人が書いたコメント / move:移動の自動コメント)',
  after:
    '種類(comment:人が書いたコメント / move:移動の自動コメント / create:作成の自動コメント / change:変更の自動コメント)',
}

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('notifications', (t) => {
    t.string('type', 30).notNullable().comment(NOTIFICATION_TYPE.after).alter()
  })
  await knex.schema.alterTable('task_comments', (t) => {
    t.string('type', 20).notNullable().comment(COMMENT_TYPE.after).alter()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex('notifications').where({ type: 'task_comment' }).delete()
  await knex('task_comments').whereIn('type', ['create', 'change']).delete()
  await knex.schema.alterTable('notifications', (t) => {
    t.string('type', 30).notNullable().comment(NOTIFICATION_TYPE.before).alter()
  })
  await knex.schema.alterTable('task_comments', (t) => {
    t.string('type', 20).notNullable().comment(COMMENT_TYPE.before).alter()
  })
}
