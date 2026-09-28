API設計
【認証】
機能	HTTPメソッド	URL
ログイン	POST	/api/login
【プロジェクト】
機能	HTTPメソッド	URL
プロジェクト一覧取得	GET	/api/projects
プロジェクト作成	POST	/api/projects
プロジェクト詳細	GET	/api/projects/{id}
プロジェクト編集	PATCH	/api/projects/{id}
プロジェクト削除	DELETE	/api/projects/{id}
【プロジェクトメンバー】
機能	HTTPメソッド	URL
メンバー追加	POST	/api/projects/{project_id}/members
メンバー削除	DELETE	/api/projects/{project_id}/members/{user_id}
【タスク】
機能	HTTPメソッド	URL
タスク一覧取得	GET	/api/projects/{project_id}/tasks
タスク作成	POST	/api/projects/{project_id}/tasks
タスク詳細	GET	/api/projects/{project_id}/tasks/{id}
タスク編集	PATCH	/api/projects/{project_id}/tasks/{id}
タスク削除	DELETE	/api/projects/{project_id}/tasks/{id}
【ユーザー一覧】
機能	HTTPメソッド	URL
ユーザー一覧取得	GET	/api/users
ユーザー作成	POST	/api/users
ユーザー詳細	GET	/api/users/{id}
ユーザー編集	PATCH	/api/users/{id}
ユーザー削除	DELETE	/api/users/{id}

【認証方式】

JWTを使用する。
ログイン成功時にJWTを発行し、
以降のAPIリクエストでJWTを利用して
ログインユーザーを識別する。

Request
ログイン POST /api/login
{
	“name”:”名前”,
	“password”:”password”	}

【プロジェクト】
プロジェクト一覧取得 GET /api/projects
プロジェクト作成 POST /api/projects
{
	name:”プロジェクト名”,
	detail:”プロジェクト詳細”,
	deadline:”2027-01-01”,
}
プロジェクト詳細 GET /api/projects/{id}
プロジェクト編集 PATCH /api/projects/{id}
{
	name:”プロジェクト名”,
	detail:”プロジェクト編集”,
	deadline:”2027-01-01”,
}
プロジェクト削除　DELETE /api/projects/{id}

【プロジェクトメンバー】
メンバー追加 POST /api/projects/{project_id}/members
{
	user_id:1
}
メンバー削除 DELETE /api/projects/{project_id}/members/{user_id}

【タスク】
タスク一覧 GET api/projects/{project_id}/tasks
タスク作成 POST /api/projects/{project_id}/tasks
{
	title:”タイトル”,
	detail:”タイトル詳細”,
	user_id:”1”,
	status:”未対応”,
	screen:””,
	deadline:”2027-01-01”,
	modified:””,
	reason:””,
	git:””,
	memo:””,}
タスク詳細 GET /api/projects/{project_id}/tasks/{id}
タスク編集 PATCH /api/projects/{project_id}/tasks/{id}
{
	title:”タイトル”,
	detail:”タイトル編集”,
	user_id:”1”,
	status:”対応中”,
	screen:””,
	deadline:”2027-01-01”,
	modified:””,
	reason:””,
	git:””,
	memo:””
}
タスク削除 DELETE /api/projects/{project_id}/tasks/{id}

【ユーザー】
ユーザー一覧 GET /api/users
ユーザー作成 POST /api/users
{
	name:”名前”,
	password:”password”
	role:1
}
ユーザー詳細 GET /api/users/{id}
ユーザー編集 PATCH /api/users/{id}
{
	name:”名前”,
	password:”pass”
	role:1
}
ユーザー削除 DELETE /api/users/{id}

Response
ログイン POST /api/login
{ 
	"id": 1, 
	"name": "名前",
	 "role": 1 
}

【プロジェクト】
プロジェクト一覧取得 GET /api/projects
[
	{
		id:1,
		name:”プロジェクト名”,
		deadline:”2027-01-01”,
	},
	{}
]
プロジェクト作成 POST /api/projects
プロジェクト詳細 GET /api/projects/{id}
{
	name:”プロジェクト名”,
	detail:”プロジェクト詳細”,
	deadline:”2027-01-01”,
	members:[
		{
			id:1,
			name:”admin”,
		}
	],
	creater:{
		id:”1”,
		name:”作成者”
	}
}
プロジェクト編集 PATCH /api/projects/{id}
プロジェクト削除　DELETE /api/projects/{id}

【プロジェクトメンバー】
メンバー追加 POST /api/projects/{project_id}/members
メンバー削除 DELETE /api/projects/{project_id}/members/{user_id}

【タスク】
タスク一覧 GET api/projects/{project_id}/tasks
[
	{
		id:1,
		title:”タイトル”,
		assignee:{
			id:1,
			name:”担当者”
		},
		status:”未対応”,
		deadline:”2027-01-01”,
	},
	{}
]
タスク作成 POST /api/projects/{project_id}/tasks

タスク詳細 GET /api/projects/{project_id}/tasks/{id}
タスク編集 PATCH /api/projects/{project_id}/tasks/{id}
{
	title:”タイトル”,
	detail:”タイトル編集”,
	assignee:{
		id:1,
		name:”担当者”
	},
	status:”対応中”,
	screen:””,
	deadline:”2027-01-01”,
	modified:””,
	reason:””,
	git:””,
	memo:””
}
タスク削除 DELETE /api/projects/{project_id}/tasks/{id}

【ユーザー】
ユーザー一覧 GET /api/users
{
	{
		users:[
			{
				id:1,
				name:”名前”,
			},
			{id:….}
		],
		
	},
}
ユーザー作成 POST /api/users
ユーザー詳細 GET /api/users/{id}
{
	id:1,
	name:”名前”,
	role:1
}
ユーザー編集 PATCH /api/users/{id}
ユーザー削除 DELETE /api/users/{id}

【エラー】
400 不正リクエスト
{
	message:"リクエストが不正です。"
}
401 認証されていない
{
	message:"ログインしてください"
}
403 権限が無い
{
	message:"操作権限がありません"
}
404 画面が存在しない
{
	message:"画面が存在しません"
}
409 Conflict(未完了のタスクを担当しているため削除できない)
{
	message:"未完了のタスクを担当しているため削除できません"
}

ログイン POST /api/login
成功 200
失敗 401
プロジェクト一覧取得 GET /api/projects
成功 200
失敗 401
プロジェクト作成 POST /api/projects
成功 201
失敗 401 or 403
プロジェクト詳細 GET /api/projects/{id}
成功 200
失敗 401
プロジェクト編集 PATCH /api/projects/{id}
成功 200
失敗 401 or 403
プロジェクト削除 DELETE /api/projects/{id}
成功 204
失敗 401 or 403

メンバー追加 POST /api/projects/{project_id}/members
成功 201
失敗 401 or 403
メンバー削除 DELETE /api/projects/{project_id}/members/{user_id}
成功 204
失敗 401 or 403 or 409(未完了のタスクを担当している)

タスク一覧取得 GET /api/projects/{project_id}/tasks
成功 200
失敗 401 or 403
タスク作成 POST /api/projects/{project_id}/tasks
成功 201
失敗 401 or 403
タスク詳細 GET /api/projects/{project_id}/tasks/{id}
成功 200
失敗 401 or 403
タスク編集 PATCH /api/projects/{project_id}/tasks/{id}
成功 200
失敗 401 or 403
タスク削除 DELETE /api/projects/{project_id}/tasks/{id}
成功 204
失敗 401 or 403

ユーザ一覧 GET /api/users
成功 200
失敗 401 or 403
ユーザー作成 POST /api/users
成功 201
失敗 401 or 403
ユーザー詳細 GET /api/users/{id}
成功 200
失敗 401 or 403
ユーザー編集 PATCH /api/users/{id}
成功 200
失敗 401 or 403
ユーザー削除 DELETE /api/users/{id}
成功 204
失敗 401 or 403 or 409(未完了のタスクを担当している)