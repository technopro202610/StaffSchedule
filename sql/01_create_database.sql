/* =========================================================
   01_create_database.sql
   スタッフ管理システム用のデータベースを作成します。
   ・postgres データベースに接続した状態で実行してください。
     （pgAdmin なら「Databases」→「postgres」を右クリック →「Query Tool」）
   ・すでに staff_schedule がある場合は「already exists」のエラーになりますが、
     そのまま 02 に進んで問題ありません。
   ========================================================= */
CREATE DATABASE staff_schedule
    ENCODING 'UTF8'
    TEMPLATE template0;
