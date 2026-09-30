import { db, type Conn } from '../db/knex'
import {
  CLOSED_STATUSES,
  DEADLINE_RED_MAX_DAYS,
  DEADLINE_YELLOW_MAX_DAYS,
  type Task,
  type TaskFields,
  type TaskFilter,
  type TaskStatus,
  type TaskSummary,
} from '../types/task'
import type { Member } from '../types/project'
import type { TagRef } from '../types/tag'
import * as commentRepository from './commentRepository'
import { toMember } from './userRepository'

const summaryColumns = [
  't.id',
  't.title',
  't.status',
  db.raw("DATE_FORMAT(t.deadline, '%Y-%m-%d') AS deadline"),
  't.list_id',
  's.id as screen_id',
  's.name as screen_name',
]

const detailColumns = [
  ...summaryColumns,
  't.updated_at',
  't.detail',
  't.modified',
  't.reason',
  't.git',
  't.memo',
]

type Row = Omit<TaskSummary, 'assignees' | 'screen'> & {
  screen_id: number | null
  screen_name: string | null
}

// 複数タスクの担当者をまとめて取得する(ID 順)
const findAssigneesByTaskIds = async (taskIds: number[]): Promise<Map<number, Member[]>> => {
  const map = new Map<number, Member[]>()
  if (taskIds.length === 0) return map
  const rows: { task_id: number; id: number; name: string; avatar_updated_at: Date | null }[] =
    await db('task_assignees as ta')
      .join('users as u', 'u.id', 'ta.user_id')
      .select('ta.task_id', 'u.id', 'u.name', 'u.avatar_updated_at')
      .whereIn('ta.task_id', taskIds)
      .orderBy('u.id')
  for (const { task_id, ...user } of rows) {
    map.set(task_id, [...(map.get(task_id) ?? []), toMember(user)])
  }
  return map
}

// 複数タスクのタグをまとめて取得する(タグの並び順)
const findTagsByTaskIds = async (taskIds: number[]): Promise<Map<number, TagRef[]>> => {
  const map = new Map<number, TagRef[]>()
  if (taskIds.length === 0) return map
  const rows: (TagRef & { task_id: number })[] = await db('task_tags as tt')
    .join('tags as g', 'g.id', 'tt.tag_id')
    .select('tt.task_id', 'g.id', 'g.name', 'g.color', 'g.text_color')
    .whereIn('tt.task_id', taskIds)
    .orderBy('g.position')
  for (const { task_id, ...tag } of rows) {
    map.set(task_id, [...(map.get(task_id) ?? []), tag])
  }
  return map
}

// 担当者・タグ・画面名を付けて API の形にする
const toTasks = async <T extends Row>(rows: T[]) => {
  const ids = rows.map((row) => row.id)
  const [assignees, tags, commentCounts] = await Promise.all([
    findAssigneesByTaskIds(ids),
    findTagsByTaskIds(ids),
    commentRepository.countByTaskIds(ids),
  ])
  return rows.map(({ screen_id, screen_name, ...rest }) => ({
    ...rest,
    // 詳細の項目を取ったときだけ updated_at がある(ISO 8601 にそろえる)
    ...('updated_at' in rest && {
      updated_at: rest.updated_at
        ? new Date(rest.updated_at as unknown as Date).toISOString()
        : null,
    }),
    assignees: assignees.get(rest.id) ?? [],
    tags: tags.get(rest.id) ?? [],
    comment_count: commentCounts.get(rest.id) ?? 0,
    screen: screen_id === null ? null : { id: screen_id, name: screen_name! },
  }))
}

// 対象プロジェクトの、論理削除されていないタスク(画面名を結合)
const activeTasks = (projectId: number, conn: Conn = db) =>
  conn('tasks as t')
    .leftJoin('screens as s', 's.id', 't.screen_id')
    .where('t.project_id', projectId)
    .whereNull('t.deleted_at')

// LIKE で使う % _ \ を文字として扱う
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

// 期限が近い順。filter の条件はすべて満たすもの(AND)
// withDetail: true なら説明・修正内容・修正理由・Git URL・メモも返す(リスト表示用)
export const findByProject = async (
  projectId: number,
  filter: TaskFilter = {},
  { withDetail = false }: { withDetail?: boolean } = {},
): Promise<(TaskSummary | Task)[]> => {
  const query = activeTasks(projectId)
    .select(withDetail ? detailColumns : summaryColumns)
    .orderBy([{ column: 't.deadline' }, { column: 't.id' }])

  if (filter.q) {
    const pattern = `%${escapeLike(filter.q)}%`
    query.where((w) => {
      for (const column of ['t.title', 't.detail', 't.modified', 't.reason', 't.memo']) {
        w.orWhere(column, 'like', pattern)
      }
    })
  }
  // 担当者に含まれているタスク
  if (filter.assigneeId !== undefined) {
    query.whereExists(
      db('task_assignees as ta')
        .whereRaw('ta.task_id = t.id')
        .where('ta.user_id', filter.assigneeId),
    )
  }
  // タグが付いているタスク
  if (filter.tagId !== undefined) {
    query.whereExists(
      db('task_tags as tg').whereRaw('tg.task_id = t.id').where('tg.tag_id', filter.tagId),
    )
  }
  if (filter.screenId === null) query.whereNull('t.screen_id')
  else if (filter.screenId !== undefined) query.where('t.screen_id', filter.screenId)
  if (filter.deadlineFrom) query.where('t.deadline', '>=', filter.deadlineFrom)
  if (filter.deadlineTo) query.where('t.deadline', '<=', filter.deadlineTo)
  if (filter.deadlineColor) {
    // 今日から期限までの日数(DB のタイムゾーンは日本時間)
    const days = 'DATEDIFF(t.deadline, CURDATE())'
    query.whereNotIn('t.status', CLOSED_STATUSES)
    if (filter.deadlineColor === 'red') query.whereRaw(`${days} <= ?`, [DEADLINE_RED_MAX_DAYS])
    else if (filter.deadlineColor === 'yellow') {
      query.whereRaw(`${days} BETWEEN ? AND ?`, [
        DEADLINE_RED_MAX_DAYS + 1,
        DEADLINE_YELLOW_MAX_DAYS,
      ])
    } else query.whereRaw(`${days} > ?`, [DEADLINE_YELLOW_MAX_DAYS])
  }

  const rows: Row[] = await query
  return toTasks(rows)
}

export const findById = async (projectId: number, id: number): Promise<Task | undefined> => {
  const row: (Row & Omit<Task, keyof TaskSummary>) | undefined = await activeTasks(projectId)
    .select(detailColumns)
    .where('t.id', id)
    .first()
  if (!row) return undefined
  const [task] = await toTasks([row])
  return task
}

export const create = async (
  projectId: number,
  fields: TaskFields,
  userId: number,
  conn: Conn = db,
): Promise<number> => {
  const [id] = await conn('tasks').insert({ ...fields, project_id: projectId, creater: userId })
  return id
}

// 担当者を指定した人たちに置き換える
export const replaceAssignees = async (taskId: number, userIds: number[], conn: Conn = db) => {
  await conn('task_assignees').where({ task_id: taskId }).delete()
  if (userIds.length > 0) {
    await conn('task_assignees').insert(
      userIds.map((userId) => ({ task_id: taskId, user_id: userId })),
    )
  }
}

// タグを指定したものに置き換える
export const replaceTags = async (taskId: number, tagIds: number[], conn: Conn = db) => {
  await conn('task_tags').where({ task_id: taskId }).delete()
  if (tagIds.length > 0) {
    await conn('task_tags').insert(tagIds.map((tagId) => ({ task_id: taskId, tag_id: tagId })))
  }
}

// 更新した件数を返す(0 なら対象が存在しない、または expectedUpdatedAt と一致しない)。
// expectedUpdatedAt を渡すと、最後の更新日時がその値のときだけ更新する(同時編集の確認)
export const update = async (
  projectId: number,
  id: number,
  fields: Partial<TaskFields>,
  userId: number,
  conn: Conn = db,
  expectedUpdatedAt?: string | null,
): Promise<number> =>
  conn('tasks')
    .where({ id, project_id: projectId })
    .whereNull('deleted_at')
    .modify((q) => {
      if (expectedUpdatedAt !== undefined) {
        q.whereRaw('updated_at <=> ?', [
          expectedUpdatedAt === null ? null : new Date(expectedUpdatedAt),
        ])
      }
    })
    .update({ ...fields, updater: userId, updated_at: db.fn.now(3) })

// 論理削除。削除した件数を返す
export const softDelete = async (projectId: number, id: number, userId: number): Promise<number> =>
  db('tasks')
    .where({ id, project_id: projectId })
    .whereNull('deleted_at')
    .update({ updater: userId, updated_at: db.fn.now(3), deleted_at: db.fn.now(3) })

// 指定したユーザーのうち、指定したステータスのタスクを担当しているユーザーの ID
export const findAssigneeIdsWithStatus = async (
  projectId: number,
  userIds: number[],
  statuses: readonly TaskStatus[],
  conn: Conn = db,
): Promise<number[]> => {
  if (userIds.length === 0) return []
  const rows: { user_id: number }[] = await conn('task_assignees as ta')
    .join('tasks as t', 't.id', 'ta.task_id')
    .distinct('ta.user_id')
    .where('t.project_id', projectId)
    .whereIn('ta.user_id', userIds)
    .whereIn('t.status', statuses)
    .whereNull('t.deleted_at')
  return rows.map((row) => row.user_id)
}

// 指定したステータスのタスクを担当しているか(削除済みのタスク・プロジェクトは除く)
export const existsByAssigneeWithStatus = async (
  userId: number,
  statuses: readonly TaskStatus[],
  conn: Conn = db,
): Promise<boolean> => {
  const row = await conn('task_assignees as ta')
    .join('tasks as t', 't.id', 'ta.task_id')
    .join('projects as p', 'p.id', 't.project_id')
    .where('ta.user_id', userId)
    .whereIn('t.status', statuses)
    .whereNull('t.deleted_at')
    .whereNull('p.deleted_at')
    .first('t.id')
  return row !== undefined
}

// 削除済みのタスクから画面名を外す(画面名を削除する前に使う)
export const clearScreenOfDeletedTasks = async (screenId: number, conn: Conn = db) => {
  await conn('tasks')
    .where({ screen_id: screenId })
    .whereNotNull('deleted_at')
    .update({ screen_id: null })
}

// 削除済みのタスクからリストを外す(リストを削除する前に使う)
export const clearListOfDeletedTasks = async (listId: number, conn: Conn = db) => {
  await conn('tasks')
    .where({ list_id: listId })
    .whereNotNull('deleted_at')
    .update({ list_id: null })
}

// タスクがどのプロジェクトにあるか(削除済みのタスク・プロジェクトは除く)
export const findLocation = async (
  id: number,
): Promise<{ id: number; project_id: number; title: string } | undefined> =>
  db('tasks as t')
    .join('projects as p', 'p.id', 't.project_id')
    .select('t.id', 't.project_id', 't.title')
    .where('t.id', id)
    .whereNull('t.deleted_at')
    .whereNull('p.deleted_at')
    .first()
