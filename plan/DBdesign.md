DB設計
users(ユーザ管理)(nameでユニーク制約)
列名	データ・タイプ	PK	FK	Not null	オートインクリメント
id	bigint unsigned	v		v	v
name	varchar(50)			v	
password	varchar(255)			v	
role	int			v	
creater	bigint unsigned		users.id	v	
created_at	datetime(3)			v	
updater	bigint unsigned		users.id		
updated_at	datetime(3)				
deleted_at	datetime(3)				

projects(プロジェクト管理)
列名	データ・タイプ	PK	FK	Not null	オートインクリメント
id	bigint unsigned	v		v	v
name	varchar(50)			v	
detail	text			v	
deadline	datetime(3)			v	
phase	varchar(20)			v	
creater	bigint unsigned		users.id	v	
created_at	datetime(3)			v	
updater	bigint unsigned		users.id		
updated_at	datetime(3)				
deleted_at	datetime(3)				

project_member (プロジェクトメンバー)(project_idとuser_idで複合主キー)(物理削除)
列名	データ・タイプ	PK	FK	Not null	オートインクリメント
project_id	bigint unsigned	v	projects.id	v	
user_id	bigint unsigned	v	users.id	v	
creater	bigint unsigned		users.id	v	
created_at	datetime(3)			v	

tasks(タスク管理)
列名	データ・タイプ	PK	FK	Not null	オートインクリメント
id	bigint unsigned	v		v	v
project_id	bigint unsigned		projects.id	v	
title	varchar(50)			v	
detail	text			v	
status	varchar(20)			v	
screen_id	bigint unsigned		screens.id		
deadline	datetime(3)			v	
modified	text				
reason	text				
git	varchar(255)				
memo	text				
creater	bigint unsigned		users.id	v	
created_at	datetime(3)			v	
updater	bigint unsigned		users.id		
updated_at	datetime(3)				
deleted_at	datetime(3)		

task_assignees(タスクの担当者)(task_idとuser_idで複合主キー)(物理削除)
列名	データ・タイプ	PK	FK	Not null	オートインクリメント
task_id	bigint unsigned	v	tasks.id	v	
user_id	bigint unsigned	v	users.id	v	

screens(画面名管理)(project_idとnameで複合ユニーク制約)(物理削除)
列名	データ・タイプ	PK	FK	Not null	オートインクリメント
id	bigint unsigned	v		v	v
project_id	bigint unsigned		projects.id	v	
name	varchar(50)			v	
creater	bigint unsigned		users.id	v	
created_at	datetime(3)			v	
updater	bigint unsigned		users.id		
updated_at	datetime(3)				

値の決まり
・users.role:1=管理者 2=リーダー 3=一般ユーザー
・users.password:bcrypt でハッシュ化した値(平文は保存しない)
・tasks.status:未対応/対応中/レビュー中/完了/対応中止
・projects.phase:企画/要件定義/設計/開発/テスト/リリース/保守/終了(作成時は企画)
・task_assignees:タスクの担当者(1タスクに1人以上)。以前の tasks.user_id(担当者1人)は、マイグレーション(20260929000003_create_task_assignees)で task_assignees に移して削除した
・tasks.screen_id:画面名(そのプロジェクトの screens から選ぶ。API で必須にしている。画面名を必須にする前に作ったタスクは NULL の場合があるため、列は NULL を許可)
・screens は物理削除。タスク(削除済みを除く)で使われている画面名は削除できない
・deadline:日付のみ使う(時刻は 00:00:00)
・created_at:登録時に自動で現在日時が入る
・deleted_at:論理削除した日時。NULL が有効なデータ(users / projects / tasks)
・project_member は物理削除(ユーザー削除時は、そのユーザーの行も削除する)
・以前の tasks.screen(自由入力の文字列)は、マイグレーション(20260929000001_create_screens)で screens に移し、tasks.screen_id に置き換えた

テーブルの管理
・テーブルは Knex のマイグレーションで作成・変更する(backend/db/migrations)
・テーブルごとに1ファイル。変更するときは既存のファイルを書き換えず、新しいマイグレーションを追加する
・初期データ(管理者 admin)は seed で登録する(backend/db/seeds)
・適用状況は knex_migrations / knex_migrations_lock テーブルで管理される

dbのつながり
users
 │
 ├──< projects ──< tasks
 │      │           ├──< task_assignees >── users(担当者)
 │      │           └── screens(画面名)
 │      ├──< screens
 │      └──< project_member >── users
 │
 └──< task_assignees