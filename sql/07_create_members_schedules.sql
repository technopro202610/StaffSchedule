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
    is_standby              BOOLEAN       NOT NULL DEFAULT TRUE,       -- TRUE＝期間中、FALSE＝期間外
    standby_off_since       DATE          NULL,                        -- 期間外になった日
    last_schedule_added_on  DATE          NULL,                        -- 最後に予定を保存した日
    work_system             VARCHAR(20)   NOT NULL DEFAULT '標準勤務',
    work_start              TIME          NOT NULL DEFAULT '09:00',
    work_end                TIME          NOT NULL DEFAULT '18:00',
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT pk_members PRIMARY KEY (member_id),
    CONSTRAINT ck_members_kana CHECK (kana ~ '^[ぁ-ゖー ]+$'),
    CONSTRAINT ck_members_off_since CHECK (is_standby OR standby_off_since IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS ix_members_kana ON members (kana);
-- ※ ログインできる人（users）とメンバーは結び付けない（仕様変更）。前に作った DB にある user_id 列は消す
ALTER TABLE members DROP COLUMN IF EXISTS user_id;

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
