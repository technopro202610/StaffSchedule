/* =========================================================
   04_check_queries.sql
   研修中に動作を確認するためのクエリ集です。
   画面で登録・ログインしたあとに実行して、DBの中身がどう変わったかを見ます。
   ・staff_schedule データベースに接続した状態で実行してください。
   ========================================================= */

-- ① 登録されているユーザーの一覧（パスワードは平文ではなくハッシュで入っていることを確認）
SELECT user_id, email, display_name,
       left(password_hash, 30) || '…' AS password_hash,
       is_active, created_at, last_login_at
FROM users
ORDER BY user_id;

-- ② 画面から新しく登録した人（直近10件）
SELECT user_id, email, display_name, created_at
FROM users
ORDER BY created_at DESC, user_id DESC
LIMIT 10;

-- ③ ログインすると last_login_at が更新される。最近ログインした順に表示
SELECT user_id, display_name, last_login_at
FROM users
WHERE last_login_at IS NOT NULL
ORDER BY last_login_at DESC;

-- ④ 利用停止にするとログインできなくなる（試したら元に戻す）
-- UPDATE users SET is_active = FALSE, updated_at = now() WHERE email = 'aoki.hanako@example.com';
-- UPDATE users SET is_active = TRUE,  updated_at = now() WHERE email = 'aoki.hanako@example.com';

-- ⑤ 同じメールアドレスは二重に登録できない（エラーコード 23505 unique_violation が出ることを確認）
-- INSERT INTO users (email, display_name, password_hash) VALUES ('aoki.hanako@example.com', 'テスト', 'x');

-- ⑥ 大文字のメールアドレスは CHECK 制約で入らない（エラーコード 23514 check_violation）
-- INSERT INTO users (email, display_name, password_hash) VALUES ('Test@Example.com', 'テスト', 'x');
