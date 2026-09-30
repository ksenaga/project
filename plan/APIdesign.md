API設計
【認証】
機能	HTTPメソッド	URL
ログイン	POST	/api/login
ログアウト	POST	/api/logout
ログインユーザー取得	GET	/api/me
【プロジェクト】
機能	HTTPメソッド	URL
プロジェクト一覧取得	GET	/api/projects
プロジェクト作成	POST	/api/projects
プロジェクト詳細	GET	/api/projects/{id}
プロジェクト編集	PATCH	/api/projects/{id}
フェーズ変更	PATCH	/api/projects/{id}/phase
プロジェクト削除	DELETE	/api/projects/{id}
【プロジェクトメンバー】
プロジェクト作成・編集の member_ids でまとめて設定する
※メンバー単体の追加・削除API(POST /api/projects/{project_id}/members、DELETE /api/projects/{project_id}/members/{user_id})は未実装
【タスク】
機能	HTTPメソッド	URL
タスク一覧取得	GET	/api/projects/{project_id}/tasks
タスク作成	POST	/api/projects/{project_id}/tasks
タスク詳細	GET	/api/projects/{project_id}/tasks/{id}
タスク編集	PATCH	/api/projects/{project_id}/tasks/{id}
タスク削除	DELETE	/api/projects/{project_id}/tasks/{id}
中止依頼	POST	/api/projects/{project_id}/tasks/{id}/cancel-request
タスクの場所を調べる	GET	/api/tasks/{id}
コメント一覧取得	GET	/api/projects/{project_id}/tasks/{task_id}/comments
コメント投稿	POST	/api/projects/{project_id}/tasks/{task_id}/comments
コメント削除	DELETE	/api/projects/{project_id}/tasks/{task_id}/comments/{id}
【画面名】
機能	HTTPメソッド	URL
画面名一覧取得	GET	/api/projects/{project_id}/screens
画面名追加	POST	/api/projects/{project_id}/screens
画面名編集	PATCH	/api/projects/{project_id}/screens/{id}
画面名削除	DELETE	/api/projects/{project_id}/screens/{id}
【ボードのリスト】
機能	HTTPメソッド	URL
リスト一覧取得	GET	/api/projects/{project_id}/lists
リスト追加	POST	/api/projects/{project_id}/lists
リスト名・色の変更	PATCH	/api/projects/{project_id}/lists/{id}
リストの並べ替え	PUT	/api/projects/{project_id}/lists/order
リスト削除	DELETE	/api/projects/{project_id}/lists/{id}
【タグ】
機能	HTTPメソッド	URL
タグ一覧取得	GET	/api/tags
【通知】
機能	HTTPメソッド	URL
通知一覧取得	GET	/api/notifications
通知を既読にする	POST	/api/notifications/{id}/read
すべて既読にする	POST	/api/notifications/read-all
【ユーザー一覧】
機能	HTTPメソッド	URL
ユーザー一覧取得	GET	/api/users
ユーザー作成	POST	/api/users
ユーザー詳細	GET	/api/users/{id}
ユーザー編集	PATCH	/api/users/{id}
ユーザー削除	DELETE	/api/users/{id}

【認証方式】

JWTを使用する。
ログイン成功時にJWTを発行し、httpOnly の Cookie(token)に保存する。
以降のAPIリクエストでは Cookie の JWT を利用してログインユーザーを識別する。
・有効期限は1日
・JWT にはユーザーIDのみを入れ、リクエストのたびにDBからユーザーを取得する(削除されたユーザーや権限の変更をすぐ反映するため)
・ログイン以外のAPIはログインが必要(未ログインは401)

【共通】
・日付(deadline)は "YYYY-MM-DD" で送受信する
・role は 1:管理者 2:リーダー 3:一般ユーザー
・status は "未対応" "対応中" "レビュー中" "完了" "対応中止"
・PATCH は送った項目だけ更新する
・削除は論理削除(deleted_at を設定)。プロジェクトメンバーのみ物理削除

Request
ログイン POST /api/login
{
	"name":"名前",
	"password":"password"
}
ログアウト POST /api/logout
(なし)
ログインユーザー取得 GET /api/me
(なし)

【プロジェクト】
プロジェクト一覧取得 GET /api/projects
プロジェクト作成 POST /api/projects
{
	"name":"プロジェクト名",	※必須。50文字以内
	"detail":"プロジェクト詳細",	※必須
	"deadline":"2027-01-01",	※必須
	"member_ids":[1,2]	※任意。プロジェクトメンバーのユーザーID
}
プロジェクト詳細 GET /api/projects/{id}
プロジェクト編集 PATCH /api/projects/{id}
※管理者(全プロジェクト)と、担当しているリーダーのみ。リーダーは member_ids から自分を外せない
{
	"name":"プロジェクト名",
	"detail":"プロジェクト詳細",
	"deadline":"2027-01-01",
	"member_ids":[1,2]	※送った場合、メンバーをこの内容に置き換える
}
フェーズ変更 PATCH /api/projects/{id}/phase
※管理者(全プロジェクト)と、担当しているリーダーのみ
{
	"phase":"設計"	※必須。企画/要件定義/設計/開発/テスト/リリース/保守/終了
}
プロジェクト削除 DELETE /api/projects/{id}

【タスク】
タスク一覧 GET /api/projects/{project_id}/tasks
絞り込み(クエリパラメータ。すべて任意。指定したものすべてに当てはまるタスクを返す)
	q=文字	タイトル・説明・修正内容・修正理由・メモに含まれる(100文字以内)
	assignee_id=1	担当者(その人が担当者に含まれるタスク)
	screen_id=1	画面名(screen_id=none は画面名なし。画面名を必須にする前に作ったタスク用)
	deadline_from=2026-10-01	期限がこの日以降
	deadline_to=2026-10-31	期限がこの日以前(deadline_from より前の日付は 400)
	deadline_color=red	期限の色。red:7日以内(期限切れを含む) yellow:8〜14日 green:15日以上
		※今日から期限までの日数で判定。完了・対応中止のタスクは含まない
	detail=1	説明・修正内容・修正理由・Git URL・メモも返す(リスト表示用。省略時は返さない)
例: /api/projects/1/tasks?q=ログイン&assignee_id=2&screen_id=3&deadline_color=yellow
タスク作成 POST /api/projects/{project_id}/tasks
{
	"title":"タイトル",	※必須。50文字以内
	"detail":"タスクの説明",	※必須
	"user_ids":[1,2],	※必須。担当者(プロジェクトメンバー。1人以上)
	"tag_ids":[1,8],	※任意。タグ(0個以上。省略時はタグなし)
	"status":"未対応",	※任意。"未対応" か "対応中" のみ(省略時は "未対応")
	"screen_id":1,	※必須。プロジェクトに登録された画面名
	"deadline":"2027-01-01",	※必須
	"modified":"",	※任意
	"reason":"",	※任意
	"git":"",	※任意。255文字以内
	"memo":""	※任意
}
※任意項目の空文字は null として保存する
タスク詳細 GET /api/projects/{project_id}/tasks/{id}
タスク編集 PATCH /api/projects/{project_id}/tasks/{id}
{
	"title":"タイトル",
	"detail":"タスクの説明",
	"user_ids":[1,2],
	"status":"対応中",
	"screen_id":1,
	"deadline":"2027-01-01",
	"modified":"",
	"reason":"",
	"git":"",
	"memo":""
}
※追加したリストへ移動するときは "list_id":3 を送る(status と同時には送れない)。status を送ると追加したリストから外れる
※一般ユーザーが送れるのは status / list_id / modified / reason / git / memo のみ(タグは変更できない)
※tag_ids を送るとタグをその内容に置き換える(担当者に含まれるタスクだけ編集できる)
※user_ids を送ると担当者をその内容に置き換える(1人以上)
※screen_id を送る場合は null 不可(画面名は必須)
タスク削除 DELETE /api/projects/{project_id}/tasks/{id}

【ボードのリスト】
※閲覧はプロジェクトメンバー。追加・名前の変更・並べ替え・削除は、管理者と担当しているリーダーのみ
※既存の5つ(未対応/対応中/レビュー中/完了/対応中止)は名前の変更・削除ができない。タスクが入っているリストは削除できない
リスト追加 POST /api/projects/{project_id}/lists(一番右に追加)
{
	"name":"先方確認待ち",	※必須。50文字以内。同じプロジェクトで重複不可
	"color":"#ede9fe"	※任意。背景色(#RRGGBB)。省略時は #f1f5f9。同じ色のリストがあってもよい
}
リスト名・色の変更 PATCH /api/projects/{project_id}/lists/{id}
※送った項目だけ変更する(追加したリストのみ)
{
	"name":"先方確認待ち",
	"color":"#ede9fe"
}
リストの並べ替え PUT /api/projects/{project_id}/lists/order
{
	"list_ids":[1,6,2,3,4,5]	※必須。すべてのリストの ID を左から並べたい順に
}
リスト削除 DELETE /api/projects/{project_id}/lists/{id}

【タスクのコメント】
※閲覧・投稿はプロジェクトメンバー(管理者は全プロジェクト)。削除は書いた本人と管理者のみ
※変更履歴として、次の自動コメントが記録される。自動コメントは削除できない
　・type:"create" タスクを作成した(「◯◯さんがタスクを作成しました」)
　・type:"move" 別のリストへ移動した(「◯◯さんがタスクを「A」から「B」に移動しました」)
　・type:"change" 項目を変更した(「◯◯さんがタスクを変更しました」の後に、1行ずつ「・期限: 2026-10-01 → 2026-10-15」のように変更内容。
　　タイトル・担当者・期限・画面名・タグは変更前と変更後、説明・修正内容・修正理由・Git URL・メモは「〜を変更」とだけ書く)
※コメントを投稿すると、タスクの担当者に通知する(書いた本人を除く)
※本文の「#12」はタスク12への、「http(s)://〜」はそのURLへのリンクとして画面に表示する(別タブで開く)
コメント一覧取得 GET /api/projects/{project_id}/tasks/{task_id}/comments
※古い順
[
	{
		"id":1,
		"type":"comment",	※comment / create / move / change
		"body":"原因を調査します",
		"user":{"id":7,"name":"t_member"},	※書いた人(自動コメントは操作した人)
		"created_at":"2026-09-30T03:21:48.042Z"
	}
]
コメント投稿 POST /api/projects/{project_id}/tasks/{task_id}/comments
{
	"body":"原因を調査します"	※必須。2000文字以内
}
※投稿したコメント1件を返す
コメント削除 DELETE /api/projects/{project_id}/tasks/{task_id}/comments/{id}
(なし)

【タスクの場所】
タスクの場所を調べる GET /api/tasks/{id}
※コメントの「#ID」やタスクのURL(/tasks/{id})から、そのタスクがあるプロジェクトを開くために使う。見られるのはプロジェクトメンバー(管理者は全プロジェクト)
Response
{
	"id":9,
	"project_id":3,
	"title":"関連する別のタスク"
}

【タスクの中止依頼】
中止依頼 POST /api/projects/{project_id}/tasks/{id}/cancel-request
※担当者に含まれる一般ユーザーのみ。全管理者と担当リーダーに通知する。完了・対応中止のタスクは不可
{
	"reason":"仕様変更で不要になったため"	※任意。200文字以内
}
Response
{
	"notified":2	※通知した人数
}

【画面名】
※プロジェクトメンバー全員(管理者は全プロジェクト)が追加・編集・削除できる
画面名一覧取得 GET /api/projects/{project_id}/screens
画面名追加 POST /api/projects/{project_id}/screens
画面名編集 PATCH /api/projects/{project_id}/screens/{id}
{
	"name":"ログイン画面"	※必須。50文字以内。同じプロジェクトで重複不可
}
画面名削除 DELETE /api/projects/{project_id}/screens/{id}

【ユーザー】
ユーザー一覧 GET /api/users
ユーザー作成 POST /api/users
{
	"name":"名前",	※必須。50文字以内。重複不可
	"password":"password",	※必須。8〜72文字
	"role":1	※必須
}
ユーザー詳細 GET /api/users/{id}
ユーザー編集 PATCH /api/users/{id}
{
	"name":"名前",
	"password":"password",	※空文字・省略時は変更しない
	"role":1	※管理者のみ。自分の権限は変更できない
}
ユーザー削除 DELETE /api/users/{id}

Response
ログイン POST /api/login
Set-Cookie: token=JWT; HttpOnly; SameSite=Lax; Max-Age=86400
{
	"id": 1,
	"name": "名前",
	"role": 1
}
ログアウト POST /api/logout
(なし) Cookie を削除する
ログインユーザー取得 GET /api/me
{
	"id": 1,
	"name": "名前",
	"role": 1
}

【プロジェクト】
プロジェクト一覧取得 GET /api/projects
※期限が近い順
※progress は進捗度。done は完了のタスク数、total は未対応・対応中・レビュー中・完了のタスク数(対応中止は含まない)
[
	{
		"id":1,
		"name":"プロジェクト名",
		"detail":"プロジェクト詳細",
		"deadline":"2027-01-01",
		"phase":"企画",
		"progress":{
			"done":2,
			"total":5
		},
		"members":[
			{
				"id":1,
				"name":"admin"
			}
		]
	},
	{}
]
プロジェクト作成 POST /api/projects
プロジェクト詳細 GET /api/projects/{id}
プロジェクト編集 PATCH /api/projects/{id}
フェーズ変更 PATCH /api/projects/{id}/phase
※4つとも同じ形
{
	"id":1,
	"name":"プロジェクト名",
	"detail":"プロジェクト詳細",
	"deadline":"2027-01-01",
	"phase":"企画",
	"progress":{
		"done":2,
		"total":5
	},
	"members":[
		{
			"id":1,
			"name":"admin"
		}
	],
	"creater":{
		"id":1,
		"name":"作成者"
	}
}
プロジェクト削除 DELETE /api/projects/{id}
(なし)

【タスク】
タスク一覧 GET /api/projects/{project_id}/tasks
※期限が近い順
[
	{
		"id":1,
		"title":"タイトル",
		"status":"未対応",
		"deadline":"2027-01-01",
		"tags":[	※タグ(タグの並び順)
			{
				"id":1,
				"name":"バグ",
				"color":"#fee2e2",
				"text_color":"#991b1b"
			}
		],
		"assignees":[	※担当者(ID 順)
			{
				"id":1,
				"name":"担当者"
			}
		],
		"screen":{	※画面名を必須にする前に作ったタスクは null
			"id":1,
			"name":"ログイン画面"
		},
		"list_id":null,	※追加したリストに入っているときはそのリストの ID(status は "対応中")
		"comment_count":2	※人が書いたコメントの数(自動コメントは数えない)
	},
	{}
]
タスク作成 POST /api/projects/{project_id}/tasks
タスク詳細 GET /api/projects/{project_id}/tasks/{id}
タスク編集 PATCH /api/projects/{project_id}/tasks/{id}
※3つとも同じ形。未入力の任意項目は null
※タスク編集では "expected_updated_at" に、編集を始めたときの updated_at を送れる(任意)。
　その後ほかの人が先に更新していたら保存せず、409 と "code":"TASK_UPDATED_BY_OTHERS" を返す(ボードでの移動では送らない)
{
	"id":1,
	"title":"タイトル",
	"status":"対応中",
	"updated_at":"2026-09-30T05:12:31.000Z",	※最後に更新した日時。一度も更新していなければ null
	"deadline":"2027-01-01",
	"detail":"タスクの説明",
	"modified":null,
	"reason":null,
	"git":null,
	"memo":null,
	"assignees":[
		{
			"id":1,
			"name":"担当者"
		}
	],
	"screen":null
}
タスク削除 DELETE /api/projects/{project_id}/tasks/{id}
(なし)

【タグ】
タグ一覧取得 GET /api/tags
※並び順。ログインしていれば誰でも取得できる
[
	{
		"id":1,
		"name":"バグ",
		"description":"想定と異なる動作・不具合",
		"color":"#fee2e2",
		"text_color":"#991b1b"
	},
	{}
]

【通知】
※ログイン中のユーザー自身の通知だけを扱う(他人の通知は既読にできない)
※通知する場面
　・プロジェクトのメンバーに追加された → 追加された人
　・タスクの担当者になった(作成・編集・コピー)→ 担当者になった人
　・タスクがレビュー中になった → 全管理者と、そのプロジェクトの担当リーダー
　・一般ユーザーがタスクの中止を依頼した → 全管理者と、そのプロジェクトの担当リーダー
　・タスクにコメントが投稿された → そのタスクの担当者
　・操作した本人には通知しない。通知の作成に失敗しても、元の操作は取り消さない
通知一覧取得 GET /api/notifications
※新しい順に30件。削除されたプロジェクトの通知は出さない
{
	"notifications":[
		{
			"id":1,
			"type":"task_review",	※project_member / task_assignee / task_review / task_cancel_request / task_comment
			"project_id":1,
			"task_id":5,	※プロジェクトの通知は null
			"message":"t_memberさんがタスク「ログイン修正」(プロジェクト)をレビュー中にしました",
			"read":false,
			"created_at":"2026-09-29T12:00:57.313Z"
		}
	],
	"unread_count":1
}
通知を既読にする POST /api/notifications/{id}/read
すべて既読にする POST /api/notifications/read-all
(なし)

【ボードのリスト】
リスト一覧取得 GET /api/projects/{project_id}/lists
※左からの並び順。status は既存の5つのときそのステータス、追加したリストは null。task_count は入っているタスク数
[
	{
		"id":1,
		"name":"未対応",
		"status":"未対応",
		"position":1,
		"color":"#e2e8f0",
		"task_count":3
	},
	{
		"id":6,
		"name":"先方確認待ち",
		"status":null,
		"position":2,
		"color":"#ede9fe",
		"task_count":0
	}
]
リスト追加・リスト名の変更は、1件分の同じ形を返す。並べ替えは一覧と同じ形を返す
リスト削除 DELETE /api/projects/{project_id}/lists/{id}
(なし)

【画面名】
画面名一覧取得 GET /api/projects/{project_id}/screens
※名前順。task_count は画面名を使っているタスク数
[
	{
		"id":1,
		"name":"ログイン画面",
		"task_count":2
	},
	{}
]
画面名追加 POST /api/projects/{project_id}/screens
画面名編集 PATCH /api/projects/{project_id}/screens/{id}
※2つとも同じ形
{
	"id":1,
	"name":"ログイン画面",
	"task_count":2
}
画面名削除 DELETE /api/projects/{project_id}/screens/{id}
(なし)

【ユーザー】
ユーザー一覧 GET /api/users
※id順。project_count は参画しているプロジェクト数
{
	"users":[
		{
			"id":1,
			"name":"名前",
			"role":1,
			"project_count":2
		},
		{}
	]
}
ユーザー作成 POST /api/users
ユーザー編集 PATCH /api/users/{id}
※2つとも同じ形
{
	"id":1,
	"name":"名前",
	"role":1,
	"project_count":2
}
ユーザー詳細 GET /api/users/{id}
※projects は参画しているプロジェクト(期限が近い順)
{
	"id":1,
	"name":"名前",
	"role":1,
	"projects":[
		{
			"id":1,
			"name":"プロジェクト名"
		}
	]
}
ユーザー削除 DELETE /api/users/{id}
(なし)

【エラー】
エラー時は message を返す。画面で見分けが必要なエラーには code も付ける
{
	"message":"エラーメッセージ",
	"code":"TASK_UPDATED_BY_OTHERS"	※付くときだけ
}

400 不正リクエスト
・"リクエストが不正です。"(必須項目がない、形式が違うなど)
・"存在しないユーザーが含まれています"(プロジェクトの member_ids)
・"存在しないタグが含まれています"
・"担当者を1人以上選んでください"
・"担当者はプロジェクトメンバーから選んでください"
・"画面名を選んでください"
・"未対応・対応中・レビュー中・完了・対応中止のリストは変更・削除できません"
・"すべてのリストを指定してください"(リストの並べ替え)
・"リストが存在しません"(タスクの list_id)
・"完了・対応中止のタスクは中止を依頼できません"(409。中止依頼)
・"自動で記録されたコメントは削除できません"(403。コメント削除)
・"担当しているタスクのみ中止を依頼できます"(403。中止依頼)
・"期限の範囲が正しくありません"(タスク一覧の deadline_from が deadline_to より後)
・"画面名はプロジェクトに登録されているものから選んでください"
・"タスクは未対応か対応中で作成してください"
・"パスワードは8〜72文字で入力してください"
・"自分の権限は変更できません"
・"自分自身は削除できません"
・"自分をプロジェクトメンバーから外すことはできません"(リーダーのプロジェクト編集)
401 認証されていない
・"ログインしてください"
・"ユーザー名またはパスワードが正しくありません"(ログイン)
403 権限が無い
・"操作権限がありません"
404 存在しない
・"画面が存在しません"(存在しないURL)
・"プロジェクトが存在しません"
・"タスクが存在しません"
・"ユーザーが存在しません"
・"画面名が存在しません"
409 Conflict
・"未完了のタスクを担当しているメンバーはプロジェクトから外せません"(プロジェクト編集)
・"完了したタスクは編集できません"(タスク編集)
・"ほかの人が先にこのタスクを更新しました。最新の内容を確認してから、もう一度編集してください"(タスク編集。code: TASK_UPDATED_BY_OTHERS)
・"このユーザー名は既に使われています"(ユーザー作成・編集)
・"この画面名は既に登録されています"(画面名追加・編集)
・"同じ名前のリストが既にあります"(リスト追加・名前の変更)
・"タスクが入っているリストは削除できません"(リスト削除)
・"タスクで使われている画面名は削除できません"(画面名削除)
・"未完了のタスクを担当しているため削除できません"(ユーザー削除)
500 サーバーエラー
・"サーバーエラーが発生しました"

ログイン POST /api/login
成功 200
失敗 400 or 401
ログアウト POST /api/logout
成功 204
ログインユーザー取得 GET /api/me
成功 200
失敗 401

プロジェクト一覧取得 GET /api/projects
成功 200
失敗 401
プロジェクト作成 POST /api/projects
成功 201
失敗 400 or 401 or 403(管理者以外)
プロジェクト詳細 GET /api/projects/{id}
成功 200
失敗 400 or 401 or 404
プロジェクト編集 PATCH /api/projects/{id}
成功 200
失敗 400 or 401 or 403(管理者・担当しているリーダー以外) or 404 or 409(未完了のタスクを担当しているメンバーを外そうとした)
フェーズ変更 PATCH /api/projects/{id}/phase
成功 200
失敗 400 or 401 or 403(管理者・担当しているリーダー以外) or 404
プロジェクト削除 DELETE /api/projects/{id}
成功 204
失敗 401 or 403(管理者以外) or 404

タスク一覧取得 GET /api/projects/{project_id}/tasks
成功 200
失敗 401 or 403(管理者以外でプロジェクトメンバーでない) or 404
タスク作成 POST /api/projects/{project_id}/tasks
成功 201
失敗 400 or 401 or 403 or 404
タスク詳細 GET /api/projects/{project_id}/tasks/{id}
成功 200
失敗 401 or 403 or 404
タスク編集 PATCH /api/projects/{project_id}/tasks/{id}
成功 200
失敗 400 or 401 or 403(一般ユーザーが他人のタスク・許可されない項目やステータスを変更) or 404 or 409(完了したタスク・ほかの人が先に更新した)
タスク削除 DELETE /api/projects/{project_id}/tasks/{id}
成功 204
失敗 401 or 403(一般ユーザー) or 404
コメント一覧取得 GET /api/projects/{project_id}/tasks/{task_id}/comments
成功 200
失敗 401 or 403 or 404
コメント投稿 POST /api/projects/{project_id}/tasks/{task_id}/comments
成功 201
失敗 400 or 401 or 403 or 404
コメント削除 DELETE /api/projects/{project_id}/tasks/{task_id}/comments/{id}
成功 204
失敗 401 or 403(本人・管理者以外、自動コメント) or 404
中止依頼 POST /api/projects/{project_id}/tasks/{id}/cancel-request
成功 201
失敗 400 or 401 or 403(一般ユーザー以外・担当者でない) or 404 or 409(完了・対応中止のタスク)
タスクの場所を調べる GET /api/tasks/{id}
成功 200
失敗 400 or 401 or 403(管理者以外でプロジェクトメンバーでない) or 404

リスト一覧取得 GET /api/projects/{project_id}/lists
成功 200
失敗 401 or 403 or 404
リスト追加 POST /api/projects/{project_id}/lists
成功 201
失敗 400 or 401 or 403(管理者・担当しているリーダー以外) or 404 or 409(重複)
リスト名・色の変更 PATCH /api/projects/{project_id}/lists/{id}
成功 200
失敗 400(既存の5つ) or 401 or 403 or 404 or 409(重複)
リストの並べ替え PUT /api/projects/{project_id}/lists/order
成功 200
失敗 400 or 401 or 403 or 404
リスト削除 DELETE /api/projects/{project_id}/lists/{id}
成功 204
失敗 400(既存の5つ) or 401 or 403 or 404 or 409(タスクが入っている)

画面名一覧取得 GET /api/projects/{project_id}/screens
成功 200
失敗 401 or 403(管理者以外でプロジェクトメンバーでない) or 404
画面名追加 POST /api/projects/{project_id}/screens
成功 201
失敗 400 or 401 or 403 or 404 or 409(重複)
画面名編集 PATCH /api/projects/{project_id}/screens/{id}
成功 200
失敗 400 or 401 or 403 or 404 or 409(重複)
画面名削除 DELETE /api/projects/{project_id}/screens/{id}
成功 204
失敗 401 or 403 or 404 or 409(タスクで使われている)

タグ一覧取得 GET /api/tags
成功 200
失敗 401

通知一覧取得 GET /api/notifications
成功 200
失敗 401
通知を既読にする POST /api/notifications/{id}/read
成功 204
失敗 400 or 401
すべて既読にする POST /api/notifications/read-all
成功 204
失敗 401

ユーザ一覧 GET /api/users
成功 200
失敗 401
ユーザー作成 POST /api/users
成功 201
失敗 400 or 401 or 403(管理者以外) or 409(名前の重複)
ユーザー詳細 GET /api/users/{id}
成功 200
失敗 400 or 401 or 404
ユーザー編集 PATCH /api/users/{id}
成功 200
失敗 400 or 401 or 403(管理者以外が他人を編集・権限を変更) or 404 or 409(名前の重複)
ユーザー削除 DELETE /api/users/{id}
成功 204
失敗 400(自分自身) or 401 or 403(管理者以外) or 404 or 409(未完了のタスクを担当している)
