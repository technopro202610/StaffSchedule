/* =========================================================
   05_create_dev_roles.sql
   【共有DB用・DB担当が実行】受講者がつなぐためのDBユーザーを作ります。
   ・staff_schedule データベースに、postgres（管理者）で接続して実行してください。
   ・pgAdmin の Query Tool でファイル全体を実行します。
   ・受講者には postgres のパスワードは配らず、1人1つずつユーザーを渡します。
   ・受講者ができるのは「データの読み書き」だけです。
     テーブルの作成・変更（CREATE / ALTER / DROP）は DB担当（と講師）だけが行います。
   ========================================================= */

-- ① 受講者用の権限のまとまり（ログインはできない「グループ」）
--    すでにある場合は「already exists」のエラーになりますが、そのまま次へ進んで構いません。
CREATE ROLE dev_member NOLOGIN;

GRANT CONNECT ON DATABASE staff_schedule TO dev_member;
GRANT USAGE ON SCHEMA public TO dev_member;

-- ② 今あるテーブルへの読み書きと、自動採番の利用を許可
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dev_member;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO dev_member;

-- ③ これから講師（postgres）が作るテーブルにも、同じ権限が自動で付くようにする
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dev_member;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO dev_member;

-- ④ 受講者1人ずつのユーザー（名前とパスワードは研修ごとに変えてください）
--    すでにいる場合はエラーになるので、その行は飛ばして構いません。
CREATE ROLE dev_tanaka LOGIN PASSWORD 'Change_me_01' IN ROLE dev_member;
CREATE ROLE dev_suzuki LOGIN PASSWORD 'Change_me_02' IN ROLE dev_member;
CREATE ROLE dev_sato   LOGIN PASSWORD 'Change_me_03' IN ROLE dev_member;

-- 確認：受講者ユーザーの一覧
SELECT r.rolname AS user_name
FROM pg_roles r
JOIN pg_auth_members m ON m.member = r.oid
JOIN pg_roles g ON g.oid = m.roleid AND g.rolname = 'dev_member'
ORDER BY r.rolname;

-- 研修が終わったら削除する場合
-- DROP ROLE dev_tanaka; DROP ROLE dev_suzuki; DROP ROLE dev_sato;
