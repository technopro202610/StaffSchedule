/* =========================================================
   02_create_tables.sql
   ユーザー（利用者）テーブルを作成します。
   ・staff_schedule データベースに接続した状態で実行してください。
   ・PostgreSQL の慣習に合わせ、テーブル名・列名は小文字のスネークケースにしています。

   ユーザー登録画面の入力項目との対応
     名前               → display_name
     メールアドレス(ID) → email          ※重複不可（UNIQUE制約）
     パスワード         → password_hash  ※平文は保存せず、ハッシュ値だけを保存
   ========================================================= */
CREATE TABLE IF NOT EXISTS users
(
    user_id        INTEGER       GENERATED ALWAYS AS IDENTITY,  -- 自動採番の主キー
    email          VARCHAR(256)  NOT NULL,                      -- ログインID
    display_name   VARCHAR(50)   NOT NULL,                      -- 名前（Teamsの表示名と同じ表記）
    password_hash  VARCHAR(200)  NOT NULL,                      -- 例: PBKDF2-SHA256$100000$ソルト$ハッシュ
    is_active      BOOLEAN       NOT NULL DEFAULT TRUE,         -- FALSE = 利用停止
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    last_login_at  TIMESTAMPTZ   NULL,                          -- 最後にログインした日時

    CONSTRAINT pk_users             PRIMARY KEY (user_id),
    CONSTRAINT uq_users_email       UNIQUE (email),                    -- 同じメールアドレスは登録できない
    CONSTRAINT ck_users_email_lower CHECK (email = lower(email))       -- 小文字で保存する決まり
);

COMMENT ON TABLE  users               IS '利用者（ログインできる人）';
COMMENT ON COLUMN users.email         IS 'ログインID。小文字に揃えて保存する';
COMMENT ON COLUMN users.password_hash IS 'PBKDF2-SHA256 のハッシュ。平文のパスワードは保存しない';
