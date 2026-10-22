/* =========================================================
   06_create_password_reset.sql
   パスワード再設定用のトークン（メールで送るリンクの鍵）を保存するテーブルを作ります。
   ・staff_schedule データベースに、postgres（管理者）で接続して実行してください。
   ・05 を先に実行していれば、受講者ユーザーにも自動で読み書きの権限が付きます。

   しくみ
     1. 利用者がメールアドレスを入力すると、推測できない長い文字列（トークン）を作り、
        リンク（例：http://localhost:5080/?reset=トークン）としてメールで送る
     2. DBにはトークンそのものではなく、SHA-256 で変換した値（token_hash）だけを保存する
        → DBの中身を見られても、リンクを作り直すことはできない
     3. リンクは30分で期限切れ（expires_at）、1回使うと使用済み（used_at）になる
   ========================================================= */
CREATE TABLE IF NOT EXISTS password_reset_tokens
(
    token_id    INTEGER      GENERATED ALWAYS AS IDENTITY,
    user_id     INTEGER      NOT NULL,
    token_hash  CHAR(64)     NOT NULL,                 -- トークンの SHA-256（16進数64文字）
    expires_at  TIMESTAMPTZ  NOT NULL,                 -- 有効期限
    used_at     TIMESTAMPTZ  NULL,                     -- 使った日時（NULL = まだ使っていない）
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT pk_password_reset_tokens PRIMARY KEY (token_id),
    CONSTRAINT uq_password_reset_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE   -- 利用者を消したらトークンも消す
);

CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user ON password_reset_tokens (user_id);

COMMENT ON TABLE  password_reset_tokens            IS 'パスワード再設定用のリンク（トークン）';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'トークンの SHA-256。トークンそのものは保存しない';

-- 確認用：最近の再設定の申請（有効なものだけ）
-- SELECT t.token_id, u.email, t.expires_at, t.used_at
-- FROM password_reset_tokens t JOIN users u ON u.user_id = t.user_id
-- WHERE t.used_at IS NULL AND t.expires_at > now()
-- ORDER BY t.created_at DESC;
