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
user_id	bigint unsigned		users.id	v	
status	varchar(20)			v	
screen	varchar(255)				
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

dbのつながり
users
 │
 ├──< projects ──< tasks
 │      │
 │      └──< project_member >── users
 │
 └──< tasks