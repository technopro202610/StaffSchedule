/* =========================================================
   00_setup_all.sql   共有DBを1回でまるごと作る（データ入り）
   ・psql で実行します（setup_shared_db.ps1 が自動で実行します）。
       psql -U postgres -h localhost -f 00_setup_all.sql
   ・何度実行しても大丈夫です。ダミーデータ（メンバー・予定・削除の記録）は入れ直されます。
     ログインできる人（users）は ON CONFLICT で重複せず、パスワード再設定の記録は残ります。
   ・中身は 01〜03・05〜08 を順につないだものです。
   ========================================================= */
\set ON_ERROR_STOP on
\encoding UTF8

-- ① データベース（なければ作る）
SELECT 'CREATE DATABASE staff_schedule ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'staff_schedule')\gexec

\connect staff_schedule

-- ================= ② users テーブル（02_create_tables.sql） =================
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
    display_name   VARCHAR(50)   NOT NULL,                      -- 名前
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

-- ================= ③ ログインできる人（12名・パスワード demo1234）（03_seed_users.sql） =================
/* =========================================================
   03_seed_users.sql
   研修用のダミーユーザー12名を登録します（画面のダミーデータと同じ人）。
   ・staff_schedule データベースに接続した状態で実行してください。
   ・パスワードは全員 demo1234 です。
   ・password_hash は C# の Pbkdf2PasswordHasher と同じ方式で作った値です。
     （同じパスワードでも、ソルトが違うのでハッシュ値は1人ずつ異なります）
   ・ON CONFLICT … DO NOTHING により、同じメールアドレスがいれば登録しません。
     （何度実行しても安全。ただし実行するたびに user_id の番号は進むため、
       あとで登録した人の番号が飛ぶことがあります。これは正常な動きです）
   ========================================================= */
INSERT INTO users (email, display_name, password_hash)
VALUES
    ('aoki.hanako@example.com', '青木 花子', 'PBKDF2-SHA256$100000$M+/LxA59mL6mLWK14NTacA==$47ouyjcwbv8741D67QhIgBPZUaCu/vjFTHyvaJqFLsI='),
    ('kato.misaki@example.com', '加藤 美咲', 'PBKDF2-SHA256$100000$Mh+GyjFj3eJz3lOE+kiodA==$pN5GxaIilJPMHYSgfH9vCUMYK4qn5BODtDlLU7qIOVg='),
    ('kobayashi.tatsuya@example.com', '小林 竜也', 'PBKDF2-SHA256$100000$t87v+oiN7O1N7B8dwAxZvw==$OXapLw/AfbmfwkmUiDkuYSZhKz6PJ4EhWbkUQ15LO9M='),
    ('sato.kenta@example.com', '佐藤 健太', 'PBKDF2-SHA256$100000$pWI2VkPmxu9y2Wl640Q+Hg==$2GTvlgP6xq14z/2QZPSbzZsdHoCGPAg/0dJ9sGWqm1U='),
    ('suzuki.ichiro@example.com', '鈴木 一郎', 'PBKDF2-SHA256$100000$a+iVvsLv5dytgJTMOWU7dw==$IfhjNXrHjMT2PNtjkotJA6ewSYgkeyogtNpdKfhtq50='),
    ('takahashi.kenta@example.com', '高橋 健太', 'PBKDF2-SHA256$100000$3zuIQQPEqoFSw6qaBaAG7w==$wJYHWD9ohy2YRnx5nUFVt9lmW8lt+h4i9v2T3+kNsF8='),
    ('tanaka.naoki@example.com', '田中 直樹', 'PBKDF2-SHA256$100000$VpMC+9j1l/5Ncb0u81+K+Q==$5Gyt8XFPS6u3YNGfh2KuVoPJXJIVYs+OTaWvab5iSnE='),
    ('nakamura.miho@example.com', '中村 みほ', 'PBKDF2-SHA256$100000$VREtaIBMqs4seUOYEOZZIw==$eopiOvjM7WFblsy6iD3nz+VyyDC9es2GRPUJAONm6KU='),
    ('yamada.taro@example.com', '山田 太郎', 'PBKDF2-SHA256$100000$zShJpWPIBoZ4TA4t3MZRJg==$LKvqwHYdCQP5Tg6vLB5X2AXCVYIKxJdwgsWpss+VRs0='),
    ('yamamoto.yuka@example.com', '山本 由香', 'PBKDF2-SHA256$100000$GT1+yr1JYWseFU4EaUmg0g==$a2TDOqknRm7zLFywpbNl8WaO82oZ/mbSLoBZDa/tRW0='),
    ('yoshida.sakura@example.com', '吉田 さくら', 'PBKDF2-SHA256$100000$c01Z2G59iQ9dh6W6HSboOw==$PSMUeOs0YRRVEqODsyE/R3ngCLjNza5aNt29cBJgpCg='),
    ('watanabe.ryo@example.com', '渡辺 涼', 'PBKDF2-SHA256$100000$QJ9+eVxovtMKJ99ZIIXdrQ==$YDGUaYznh6+DasxfX99Tdsmg0Ebx0y1j0hRV2vebqnk=')
ON CONFLICT (email) DO NOTHING;

-- ================= ④ パスワード再設定のテーブル（06_create_password_reset.sql） =================
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

-- ================= ⑤ メンバー・予定などのテーブル（07_create_members_schedules.sql） =================
/* =========================================================
   07_create_members_schedules.sql
   メンバー・予定・お知らせ用のテーブルを作ります（詳細設計書「4.テーブル定義」）。
   ・staff_schedule データベースに、postgres（管理者）で接続して実行してください。
   ・02（users）を先に実行しておくこと。
   ・05 を実行済みなら、受講者ユーザーにも自動で読み書きの権限が付きます。

   作るテーブル
     members             … メンバー（スタンバイ期間中／期間外）
     schedules           … 予定（1日に何件でも）
     member_delete_logs  … メンバーを削除した記録（お知らせの「削除済み」1か月分に使う）
     notice_reads        … お知らせを見た記録（未読の数・ログイン時のお知らせに使う）
   ========================================================= */

CREATE TABLE IF NOT EXISTS members
(
    member_id               INTEGER       GENERATED ALWAYS AS IDENTITY,
    name                    VARCHAR(30)   NOT NULL,                    -- 名前（空白は半角1つにそろえる）
    kana                    VARCHAR(40)   NOT NULL,                    -- ふりがな（ひらがな）。50音順に使う
    user_id                 INTEGER       NULL,                        -- ログインできる人と同じ人なら利用者ID
    is_standby              BOOLEAN       NOT NULL DEFAULT TRUE,       -- TRUE＝期間中、FALSE＝期間外
    standby_off_since       DATE          NULL,                        -- 期間外になった日
    last_schedule_added_on  DATE          NULL,                        -- 最後に予定を保存した日
    work_system             VARCHAR(20)   NOT NULL DEFAULT '標準勤務',
    work_start              TIME          NOT NULL DEFAULT '09:00',
    work_end                TIME          NOT NULL DEFAULT '18:00',
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT pk_members PRIMARY KEY (member_id),
    CONSTRAINT uq_members_user UNIQUE (user_id),
    CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT ck_members_kana CHECK (kana ~ '^[ぁ-ゖー ]+$'),
    CONSTRAINT ck_members_off_since CHECK (is_standby OR standby_off_since IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS ix_members_kana ON members (kana);

CREATE TABLE IF NOT EXISTS schedules
(
    schedule_id  INTEGER       GENERATED ALWAYS AS IDENTITY,
    member_id    INTEGER       NOT NULL,
    work_date    DATE          NOT NULL,
    item_code    VARCHAR(10)   NOT NULL,   -- work 出社 / home 在宅 / paid 有給 / am 午前休 / pm 午後休 / gyo 業確 / health 健康診断 / other 自由記述
    start_time   TIME          NOT NULL,
    end_time     TIME          NOT NULL,
    item_name    VARCHAR(20)   NULL,       -- 自由記述の項目名
    memo         VARCHAR(100)  NULL,       -- 備考
    sort_no      SMALLINT      NOT NULL DEFAULT 0,
    updated_by   INTEGER       NULL,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT pk_schedules PRIMARY KEY (schedule_id),
    CONSTRAINT fk_schedules_member FOREIGN KEY (member_id) REFERENCES members (member_id) ON DELETE CASCADE,
    CONSTRAINT fk_schedules_user FOREIGN KEY (updated_by) REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT ck_schedules_item CHECK (item_code IN ('work','home','paid','am','pm','gyo','health','other')),
    CONSTRAINT ck_schedules_time CHECK (end_time > start_time),
    CONSTRAINT ck_schedules_other CHECK (item_code <> 'other' OR length(item_name) > 0)
);
CREATE INDEX IF NOT EXISTS ix_schedules_member_date ON schedules (member_id, work_date);
CREATE INDEX IF NOT EXISTS ix_schedules_date ON schedules (work_date);

CREATE TABLE IF NOT EXISTS member_delete_logs
(
    log_id       INTEGER       GENERATED ALWAYS AS IDENTITY,
    member_name  VARCHAR(30)   NOT NULL,            -- 削除したときの名前
    deleted_on   DATE          NOT NULL,
    is_manual    BOOLEAN       NOT NULL,            -- TRUE＝削除ボタン、FALSE＝6か月経過の自動削除
    deleted_by   INTEGER       NULL,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT pk_member_delete_logs PRIMARY KEY (log_id),
    CONSTRAINT fk_member_delete_logs_user FOREIGN KEY (deleted_by) REFERENCES users (user_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS ix_member_delete_logs_date ON member_delete_logs (deleted_on);

CREATE TABLE IF NOT EXISTS notice_reads
(
    user_id      INTEGER       NOT NULL,
    member_id    INTEGER       NOT NULL,
    kind         VARCHAR(10)   NOT NULL,            -- list＝お知らせ一覧で見た、popup＝ログイン時に知らせた
    delete_date  DATE          NOT NULL,            -- 見たときの削除日（変わったら、もう一度知らせる）
    read_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT pk_notice_reads PRIMARY KEY (user_id, member_id, kind),
    CONSTRAINT fk_notice_reads_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_notice_reads_member FOREIGN KEY (member_id) REFERENCES members (member_id) ON DELETE CASCADE,
    CONSTRAINT ck_notice_reads_kind CHECK (kind IN ('list','popup'))
);

COMMENT ON TABLE members            IS 'メンバー（スタンバイ期間中／期間外）';
COMMENT ON TABLE schedules          IS '予定（1日に何件でも）';
COMMENT ON TABLE member_delete_logs IS 'メンバーを削除した記録（お知らせの削除済みに使う）';
COMMENT ON TABLE notice_reads       IS 'お知らせを見た記録';

-- ================= ⑥ 受講者用のDBユーザー =================
/* ---------- 受講者用のDBユーザー（05 と同じ内容。何度実行してもエラーにならない形） ---------- */
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dev_member') THEN
    CREATE ROLE dev_member NOLOGIN;
  END IF;
END $$;
GRANT CONNECT ON DATABASE staff_schedule TO dev_member;
GRANT USAGE ON SCHEMA public TO dev_member;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dev_member;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO dev_member;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dev_member;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO dev_member;

-- 受講者1人ずつ（パスワードは接続情報カードに書いて本人だけに渡す）
DO $$
DECLARE u record;
BEGIN
  FOR u IN SELECT * FROM (VALUES
      ('dev_erikawa',   'QUKDQU_500'),
      ('dev_yamazaki',  'A5mTVe_022'),
      ('dev_yoshihara', 'od0W72_232')
  ) AS t(name, pw)
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = u.name) THEN
      EXECUTE format('ALTER ROLE %I LOGIN PASSWORD %L', u.name, u.pw);
    ELSE
      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', u.name, u.pw);
    END IF;
    EXECUTE format('GRANT dev_member TO %I', u.name);
  END LOOP;
END $$;

-- ================= ⑦ ダミーデータ（08_seed_dummy_data.sql） =================
/* =========================================================
   08_seed_dummy_data.sql
   テスト用のダミーデータ（メンバー・予定・削除の記録）を入れます。
   ・staff_schedule データベースに接続して実行してください（03・07 を先に実行）。
   ・日付は「実行した日」から計算するので、いつ実行しても同じ見え方になります。
   ・何度でも実行できます。実行すると、メンバー・予定・削除の記録・既読を全部消してから入れ直します。
     （users と password_reset_tokens は消しません）

   入るデータ
     ・メンバー14名（画面のダミーと同じ13名＋名前が長い人1名）
       期間中：9名（うち1名は名前が7文字を超える）
       期間外：5名 … 削除のテスト用
         渡辺 涼     ：2日後に削除予定（お知らせに出る）
         中村 みほ   ：7日後に削除予定（お知らせに出る：ちょうど1週間前）
         鈴木 一郎   ：10日後に削除予定（まだお知らせに出ない）
         吉田 さくら ：60日後に削除予定（まだお知らせに出ない）
         井上 翼     ：削除日を5日過ぎている → 次にだれかがログインしたとき自動で削除される
     ・予定：期間中の人の、先週〜再来週の平日（出社）＋今週の特別な予定（2件の日・備考・自由記述など）
     ・削除の記録：この1か月に20名（うち手動5名）＋1か月より前に1名（お知らせには出ない）
   ========================================================= */

BEGIN;

-- ① 入れ直す前に、今のデータを消す（番号も1から振り直す）
TRUNCATE notice_reads, schedules, member_delete_logs, members RESTART IDENTITY;

-- ② メンバー
--    ログインできる人（users）と同じメールアドレスの人は user_id で結び付ける
--    期間外の人は「削除日 = 期間外になった日 ＋ 6か月」になるよう、削除日から逆算して入れる
INSERT INTO members (name, kana, user_id, is_standby, standby_off_since, work_system, work_start, work_end)
SELECT d.name, d.kana,
       (SELECT u.user_id FROM users u WHERE u.email = d.email),
       d.off_in IS NULL,
       CASE WHEN d.off_in IS NULL THEN NULL
            ELSE (current_date + d.off_in - interval '6 months')::date END,
       d.sys, d.s, d.e
FROM (VALUES
    -- 名前,          ふりがな,             メールアドレス,                   削除まで何日（NULL＝期間中）, 勤務システム, 開始, 終了
    ('青木 花子',      'あおき はなこ',       'aoki.hanako@example.com',        NULL::int, '標準勤務', TIME '09:00', TIME '18:00'),
    ('加藤 美咲',      'かとう みさき',       'kato.misaki@example.com',        NULL,      '標準勤務', '09:00', '18:00'),
    ('小林 竜也',      'こばやし たつや',     'kobayashi.tatsuya@example.com',  NULL,      '標準勤務', '09:00', '18:00'),
    ('佐藤 健太',      'さとう けんた',       'sato.kenta@example.com',         NULL,      '標準勤務', '09:00', '18:00'),
    ('高橋 健太',      'たかはし けんた',     'takahashi.kenta@example.com',    NULL,      '標準勤務', '09:00', '18:00'),
    ('田中 直樹',      'たなか なおき',       'tanaka.naoki@example.com',       NULL,      '標準勤務', '09:00', '18:00'),
    ('山田 太郎',      'やまだ たろう',       'yamada.taro@example.com',        NULL,      '標準勤務', '09:00', '18:00'),
    ('山本 由香',      'やまもと ゆか',       'yamamoto.yuka@example.com',      NULL,      '標準勤務', '09:00', '18:00'),
    ('長谷川原 美咲子', 'はせがわら みさこ',  NULL,                             NULL,      '標準勤務', '09:00', '18:00'),
    ('渡辺 涼',        'わたなべ りょう',     'watanabe.ryo@example.com',       2,         '標準勤務', '09:00', '18:00'),
    ('中村 みほ',      'なかむら みほ',       'nakamura.miho@example.com',      7,         '標準勤務', '09:00', '18:00'),
    ('鈴木 一郎',      'すずき いちろう',     'suzuki.ichiro@example.com',      10,        '早番勤務', '08:30', '17:30'),
    ('吉田 さくら',    'よしだ さくら',       'yoshida.sakura@example.com',     60,        '遅番勤務', '10:00', '19:00'),
    ('井上 翼',        'いのうえ つばさ',     NULL,                             -5,        '標準勤務', '09:00', '18:00')
) AS d(name, kana, email, off_in, sys, s, e);

-- ③ 予定：期間中の人の、先週の月曜〜再来週の金曜の平日に「出社」（所定時間）
INSERT INTO schedules (member_id, work_date, item_code, start_time, end_time)
SELECT m.member_id, g.d::date, 'work', m.work_start, m.work_end
FROM members m
CROSS JOIN generate_series(date_trunc('week', current_date) - interval '7 days',
                           date_trunc('week', current_date) + interval '18 days',
                           interval '1 day') AS g(d)
WHERE m.is_standby
  AND extract(isodow FROM g.d) BETWEEN 1 AND 5;

-- ④ 今週の特別な予定（いったんその日の出社を消して入れ直す）
--    w = 今週の月曜日。w + 1 = 火曜日 …
CREATE TEMP TABLE tmp_special (name text, day int, item text, s time, e time, item_name text, memo text, sort_no int) ON COMMIT DROP;
INSERT INTO tmp_special VALUES
    ('加藤 美咲', 2, 'work',   '09:00', '12:00', NULL,   NULL, 1),   -- 水：出社＋午後休（予定2件）
    ('加藤 美咲', 2, 'pm',     '13:00', '18:00', NULL,   NULL, 2),
    ('佐藤 健太', 1, 'gyo',    '09:00', '12:00', NULL,   NULL, 1),   -- 火：業確＋出社（予定2件）
    ('佐藤 健太', 1, 'work',   '13:00', '18:00', NULL,   NULL, 2),
    ('山本 由香', 3, 'am',     '09:00', '12:00', NULL,   NULL, 1),   -- 木：午前休＋出社（予定2件）
    ('山本 由香', 3, 'work',   '13:00', '18:00', NULL,   NULL, 2),
    ('青木 花子', 3, 'work',   '09:00', '18:00', NULL,   '客先（丸の内）で打合せ。終わり次第、帰社します。', 1), -- 木：備考あり
    ('山田 太郎', 4, 'home',   '09:00', '18:00', NULL,   NULL, 1),   -- 金：在宅
    ('高橋 健太', 0, 'paid',   '09:00', '18:00', NULL,   NULL, 1),   -- 月：有給
    ('田中 直樹', 2, 'work',   '09:00', '14:00', NULL,   NULL, 1),   -- 水：出社＋健康診断（予定2件）
    ('田中 直樹', 2, 'health', '14:00', '15:00', NULL,   '本社 3F 医務室', 2),
    ('小林 竜也', 4, 'work',   '09:00', '12:00', NULL,   NULL, 1),   -- 金：出社＋自由記述「研修」（予定2件）
    ('小林 竜也', 4, 'other',  '13:00', '17:00', '研修', NULL, 2);

DELETE FROM schedules s
USING members m, (SELECT DISTINCT name, day FROM tmp_special) t
WHERE s.member_id = m.member_id AND m.name = t.name
  AND s.work_date = (date_trunc('week', current_date) + t.day * interval '1 day')::date;

INSERT INTO schedules (member_id, work_date, item_code, start_time, end_time, item_name, memo, sort_no)
SELECT m.member_id, (date_trunc('week', current_date) + t.day * interval '1 day')::date,
       t.item, t.s, t.e, t.item_name, t.memo, t.sort_no
FROM tmp_special t JOIN members m ON m.name = t.name;

-- 予定を入れた人は「最後に予定を保存した日」を昨日にしておく
UPDATE members SET last_schedule_added_on = current_date - 1 WHERE is_standby;

-- ⑤ 削除の記録：この1か月に20名（うち手動5名）＋1か月より前に1名
INSERT INTO member_delete_logs (member_name, deleted_on, is_manual)
SELECT d.name, current_date - d.ago, d.manual
FROM (VALUES
    ('前田 健一', 20, false), ('石川 真由', 1, true),  ('森本 拓海', 2, false), ('西村 彩', 3, false),
    ('松井 大和', 4, true),   ('岡田 美穂', 5, false), ('藤田 翔', 6, false),   ('長谷川 恵', 8, false),
    ('村上 颯太', 9, true),   ('近藤 千尋', 11, false),('坂本 陽菜', 12, false),('遠藤 悠真', 14, false),
    ('青山 理沙', 15, true),  ('福田 蓮', 17, false),  ('太田 結衣', 18, false),('三浦 大地', 21, false),
    ('原田 美咲', 23, true),  ('小松 健', 25, false),  ('中島 花音', 27, false),('横山 隼人', 29, false),
    ('岡本 大輔', 45, false)   -- 1か月より前なので、お知らせには出ない
) AS d(name, ago, manual);

COMMIT;

-- ⑥ 確認用
-- メンバーと削除日（期間外の人だけ）
SELECT name, kana, is_standby, standby_off_since,
       CASE WHEN is_standby THEN NULL
            ELSE (GREATEST(standby_off_since, last_schedule_added_on) + interval '6 months')::date END AS delete_date
FROM members ORDER BY kana;
-- 今週の予定の件数（メンバーごと）
SELECT m.name, count(*) AS this_week
FROM schedules s JOIN members m ON m.member_id = s.member_id
WHERE s.work_date BETWEEN date_trunc('week', current_date) AND date_trunc('week', current_date) + interval '6 days'
GROUP BY m.name, m.kana ORDER BY m.kana;

-- ================= ⑧ できあがりの確認 =================
SELECT 'users' AS テーブル, count(*) AS 件数 FROM users
UNION ALL SELECT 'members', count(*) FROM members
UNION ALL SELECT 'schedules', count(*) FROM schedules
UNION ALL SELECT 'member_delete_logs', count(*) FROM member_delete_logs;
