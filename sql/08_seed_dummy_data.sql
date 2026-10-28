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
--    ※ ログインできる人（users）とは結び付けない（別のもの）
--    期間外の人は「削除日 = 期間外になった日 ＋ 6か月」になるよう、削除日から逆算して入れる
INSERT INTO members (name, kana, is_standby, standby_off_since, work_system, work_start, work_end)
SELECT d.name, d.kana,
       d.off_in IS NULL,
       CASE WHEN d.off_in IS NULL THEN NULL
            ELSE (current_date + d.off_in - interval '6 months')::date END,
       d.sys, d.s, d.e
FROM (VALUES
    -- 名前,           ふりがな,             削除まで何日（NULL＝期間中）, 勤務システム, 開始, 終了
    ('青木 花子',       'あおき はなこ',      NULL::int, '標準勤務', TIME '09:00', TIME '18:00'),
    ('加藤 美咲',       'かとう みさき',      NULL,      '標準勤務', '09:00', '18:00'),
    ('小林 竜也',       'こばやし たつや',    NULL,      '標準勤務', '09:00', '18:00'),
    ('佐藤 健太',       'さとう けんた',      NULL,      '標準勤務', '09:00', '18:00'),
    ('高橋 健太',       'たかはし けんた',    NULL,      '標準勤務', '09:00', '18:00'),
    ('田中 直樹',       'たなか なおき',      NULL,      '標準勤務', '09:00', '18:00'),
    ('山田 太郎',       'やまだ たろう',      NULL,      '標準勤務', '09:00', '18:00'),
    ('山本 由香',       'やまもと ゆか',      NULL,      '標準勤務', '09:00', '18:00'),
    ('長谷川原 美咲子', 'はせがわら みさこ',  NULL,      '標準勤務', '09:00', '18:00'),
    ('渡辺 涼',         'わたなべ りょう',    2,         '標準勤務', '09:00', '18:00'),
    ('中村 みほ',       'なかむら みほ',      7,         '標準勤務', '09:00', '18:00'),
    ('鈴木 一郎',       'すずき いちろう',    10,        '早番勤務', '08:30', '17:30'),
    ('吉田 さくら',     'よしだ さくら',      60,        '遅番勤務', '10:00', '19:00'),
    ('井上 翼',         'いのうえ つばさ',    -5,        '標準勤務', '09:00', '18:00')
) AS d(name, kana, off_in, sys, s, e);

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
