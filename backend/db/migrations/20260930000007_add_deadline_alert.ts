import type { Knex } from 'knex'

// 期限の色が変わったときの通知(緑 → 黄色、黄色 → 赤)
//   ・tasks.deadline_alert_level に、最後に知らせた色(0:なし・緑 / 1:黄色 / 2:赤)を持ち、同じ色で2回通知しない
//   ・期限の通知は操作した人がいないので、notifications.actor_id を NULL にできるようにする
const NOTIFICATION_TYPE = {
  before:
    '種類(project_member:メンバーに追加 / task_assignee:担当者になった / task_review:レビュー中になった / task_cancel_request:中止依頼 / task_comment:担当タスクへのコメント / task_mention:コメントでのメンション)',
  after:
    '種類(project_member:メンバーに追加 / task_assignee:担当者になった / task_review:レビュー中になった / task_cancel_request:中止依頼 / task_comment:担当タスクへのコメント / task_mention:コメントでのメンション / task_deadline:期限が迫っている)',
}

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tasks', (t) => {
    t.tinyint('deadline_alert_level')
      .unsigned()
      .notNullable()
      .defaultTo(0)
      .comment('期限の通知で最後に知らせた色(0:なし・緑 / 1:黄色 / 2:赤)')
  })
  // 今ある未完了のタスクは、今の色を知らせた扱いにする(適用した直後にまとめて通知しないように)
  await knex.raw(`
    UPDATE tasks SET deadline_alert_level =
      CASE WHEN DATEDIFF(deadline, CURDATE()) <= 7 THEN 2
           WHEN DATEDIFF(deadline, CURDATE()) <= 14 THEN 1
           ELSE 0 END
    WHERE status NOT IN ('完了', '対応中止')
  `)
  await knex.schema.alterTable('notifications', (t) => {
    t.string('type', 30).notNullable().comment(NOTIFICATION_TYPE.after).alter()
    t.bigInteger('actor_id')
      .unsigned()
      .nullable()
      .comment('操作したユーザー(期限の通知など、操作した人がいないときは NULL)')
      .alter()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex('notifications').where({ type: 'task_deadline' }).delete()
  await knex.schema.alterTable('notifications', (t) => {
    t.string('type', 30).notNullable().comment(NOTIFICATION_TYPE.before).alter()
    t.bigInteger('actor_id').unsigned().notNullable().comment('操作したユーザー').alter()
  })
  await knex.schema.alterTable('tasks', (t) => {
    t.dropColumn('deadline_alert_level')
  })
}
