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
failed_login_count	int unsigned			v		※ログインに続けて失敗した回数(初期値0。成功・ロックで0に戻す)
locked_until	datetime(3)					※この日時までログインできない(NULL ならロックしていない)
avatar_updated_at	datetime(3)					※アイコン画像を設定した日時(NULL なら画像なし。画像の URL に付けてキャッシュを切り替える)

user_avatars(ユーザーのアイコン画像)(テーブル・列にDBのコメントあり)(物理削除)
列名	データ・タイプ	PK	FK	Not null	オートインクリメント
user_id	bigint unsigned	v	users.id	v	
content_type	varchar(30)			v	
data	mediumblob			v	
created_at	datetime(3)			v	
※画像は users とは別のテーブルに持つ(一覧などで users を読むときに画像のデータまで読まないように)

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
list_id	bigint unsigned		board_lists.id		
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

board_lists(ボードのリスト)(project_idとnameで複合ユニーク制約)(物理削除)
列名	データ・タイプ	PK	FK	Not null	オートインクリメント
id	bigint unsigned	v		v	v
project_id	bigint unsigned		projects.id	v	
name	varchar(50)			v	
status	varchar(20)				
position	int			v	
color	varchar(7)			v	
creater	bigint unsigned		users.id	v	
created_at	datetime(3)			v	
updater	bigint unsigned		users.id		
updated_at	datetime(3)				

tags(タグ)(nameでユニーク制約)(マイグレーションで8つ登録。テーブル・列にDBのコメントあり)
列名	データ・タイプ	PK	FK	Not null	オートインクリメント
id	bigint unsigned	v		v	v
name	varchar(20)			v	
description	varchar(255)			v	
color	varchar(7)			v	
text_color	varchar(7)			v	
position	int			v	

task_tags(タスクに付けたタグ)(task_idとtag_idで複合主キー)(物理削除)
列名	データ・タイプ	PK	FK	Not null	オートインクリメント
task_id	bigint unsigned	v	tasks.id	v	
tag_id	bigint unsigned	v	tags.id	v	

タグの種類(tags.description に意味を入れている)
タグ	意味
バグ	想定と異なる動作・不具合
修正	既存機能の修正・変更
要望	ユーザーからの機能追加・改善要望
改善	既存機能の使いやすさ・性能などの改善
新規	新しい機能の追加
調査	原因や仕様などを調査するチケット
問い合わせ	仕様確認・操作方法などの問い合わせ
緊急	緊急対応が必要なもの

notifications(通知)(テーブル・列にDBのコメントあり)(user_id・read_at にインデックス)
列名	データ・タイプ	PK	FK	Not null	オートインクリメント
id	bigint unsigned	v		v	v
user_id	bigint unsigned		users.id	v	
type	varchar(30)			v	
project_id	bigint unsigned		projects.id	v	
task_id	bigint unsigned		tasks.id		
actor_id	bigint unsigned		users.id	v	
message	varchar(255)			v	
read_at	datetime(3)				
created_at	datetime(3)			v	

task_comments(タスクのコメント)(テーブル・列にDBのコメントあり)(task_id・created_at にインデックス)(物理削除)
列名	データ・タイプ	PK	FK	Not null	オートインクリメント
id	bigint unsigned	v		v	v
task_id	bigint unsigned		tasks.id	v	
user_id	bigint unsigned		users.id	v	
type	varchar(20)			v	
body	text			v	
created_at	datetime(3)			v	

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
・board_lists.color:リストの背景色(#RRGGBB。明るめの色)。既存の5つはステータスの色を明るくしたもの(未対応 #e2e8f0 / 対応中 #dbeafe / レビュー中 #fef3c7 / 完了 #dcfce7 / 対応中止 #fee2e2)。追加したリストは作成時に選ぶ(同じ色でもよい)
・board_lists:プロジェクトごとのボードのリスト。position が左からの並び順。既存の5つ(未対応/対応中/レビュー中/完了/対応中止)は status にそのステータスが入り、名前の変更・削除はできない。追加したリストは status が NULL。プロジェクト作成時に既存の5つを作る
・tasks.list_id:追加したリストに入っているときのリスト(既存の5つのときは NULL で、status のリストに入る)。追加したリストに入っているタスクの status は「対応中」にして、未完了として扱う(進捗度・期限の色・メンバーを外すときのチェック)
・projects.phase:企画/要件定義/設計/開発/テスト/リリース/保守/終了(作成時は企画)
・task_assignees:タスクの担当者(1タスクに1人以上)。以前の tasks.user_id(担当者1人)は、マイグレーション(20260929000003_create_task_assignees)で task_assignees に移して削除した
・tasks.screen_id:画面名(そのプロジェクトの screens から選ぶ。API で必須にしている。画面名を必須にする前に作ったタスクは NULL の場合があるため、列は NULL を許可)
・screens は物理削除。タスク(削除済みを除く)で使われている画面名は削除できない
・deadline:日付のみ使う(時刻は 00:00:00)
・created_at:登録時に自動で現在日時が入る
・deleted_at:論理削除した日時。NULL が有効なデータ(users / projects / tasks)
・project_member は物理削除(ユーザー削除時は、そのユーザーの行も削除する)
・以前の tasks.screen(自由入力の文字列)は、マイグレーション(20260929000001_create_screens)で screens に移し、tasks.screen_id に置き換えた

DBのコメント
・tags / task_tags / notifications / task_comments / user_avatars はテーブルと列に DB のコメントを付けている(それ以外のテーブルは未設定。users は追加した列のみ)
・task_comments.type:comment(人が書いたコメント)/ create(タスクを作成したときの自動コメント)/ move(タスクを移動したときの自動コメント。誰がどこからどこへ移動したかのログ代わり)/ change(項目を変更したときの自動コメント。変更内容を1行ずつ記録)。自動コメントは削除できない
・notifications.type:project_member(プロジェクトのメンバーに追加された)/ task_assignee(タスクの担当者になった)/ task_review(タスクがレビュー中になった)/ task_cancel_request(中止依頼)/ task_comment(担当しているタスクにコメントが投稿された)/ task_mention(コメントでメンションされた)。message は通知したときの名前で作った文章。read_at が NULL なら未読

テーブルの管理
・テーブルは Knex のマイグレーションで作成・変更する(backend/db/migrations)
・テーブルごとに1ファイル。変更するときは既存のファイルを書き換えず、新しいマイグレーションを追加する
・初期データ(管理者 admin)は seed で登録する(backend/db/seeds)
・適用状況は knex_migrations / knex_migrations_lock テーブルで管理される

dbのつながり
users
 │
 ├── user_avatars(アイコン画像。1人1枚)
 ├──< projects ──< tasks
 │      │           ├──< task_assignees >── users(担当者)
 │      │           ├──< task_tags >── tags(タグ)
 │      │           └── screens(画面名)
 │      ├──< screens
 │      ├──< board_lists ──< tasks(list_id)
 │      └──< project_member >── users
 │
 └──< task_assignees