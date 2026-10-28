/* =========================================================
   共通部品（全画面で使う）
   一番最初に読み込みます。ここにある関数・定数は、ほかのどのファイルからも使えます。

   このファイルの中身
     1. アイコン・予定の項目・マーク        … ICONS / ITEMS / CHIP_STYLES など
     2. メンバー（研修用のダミー）           … MEMBERS
     3. 日付・時刻の便利な関数              … toDateText / addDays / mondayOf など
     4. 予定のデータ                        … newEntry / getEntries（ダミーの予定は generate）
     5. 画面の状態（state）と保存           … state / persist
     6. 画面の部品                          … getElement / escapeHtml / toast / openLayer など
     7. ログイン系の画面で共通              … showScreen / fieldErr / isMail
     8. サーバー（C#）との通信              … api
     9. 祝日                                … holidayName
    10. 文字の変換                          … toKata / toHira / spaces

   よく使う言葉
     ・メンバー … 予定表に並ぶ人。{ id, name, kana, mail, sys（勤務システム）, sched（所定の開始・終了） … }
     ・予定     … 1件の予定。{ item（項目コード）, start, end（"HH:MM"）, note（自由記述の名前）, memo（備考） }
     ・日付の文字 … "YYYY-MM-DD"（例："2026-10-21"）。予定は "メンバーID|日付の文字" をキーにして保存する
   ========================================================= */
"use strict";

/* =========================================================
   1. アイコン・予定の項目・マーク
   ========================================================= */

// 画面で使うアイコン（SVG の文字）。ICONS.prev のように使う
const ICONS = {
  normal:
    '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></svg>',
  late: '<svg class="icon" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-8 8"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  early:
    '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l-3 3"/></svg>',
  shift:
    '<svg class="icon" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  out: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/></svg>',
  other:
    '<svg class="icon" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>',
  caret: '<svg class="icon caret" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  chev: '<svg class="icon chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  close: '<svg class="icon" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  trash:
    '<svg class="icon" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  prev: '<svg class="icon" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg class="icon" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  plus: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
};

ICONS.gyo =
  '<svg class="icon" viewBox="0 0 24 24"><path d="M9 4h6v3H9zM7 5H5v16h14V5h-2"/><path d="M9 14l2 2 4-4"/></svg>';

ICONS.paid =
  '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

ICONS.am =
  '<svg class="icon" viewBox="0 0 24 24"><path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v4M5.6 9.6 7 11M18.4 9.6 17 11"/></svg>';

ICONS.pm =
  '<svg class="icon" viewBox="0 0 24 24"><path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 3v6M9.5 6.5 12 9l2.5-2.5"/></svg>';

ICONS.home =
  '<svg class="icon" viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/></svg>';

ICONS.health =
  '<svg class="icon" viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><path d="M9 11h6M12 8v6"/></svg>';

ICONS.memo =
  '<svg class="icon" viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>';

ICONS.tag =
  '<svg class="icon" viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/></svg>';

// 予定の項目（予定登録の画面で使う）
//   label … 項目名、dot … 色、mark … マーク（絵文字か文字の雨）、count … 実働に含めるか
const ITEMS = {
  work: { label: "出社", dot: "#2563eb", mark: "🏢", count: true },
  home: { label: "在宅", dot: "#16a34a", mark: "🏠", count: true },
  health: { label: "健康診断", dot: "#db2777", mark: "🏥", count: false },
  am: { label: "午前休", dot: "#ea8a0c", mark: "☀️", count: false },
  pm: { label: "午後休", dot: "#e0ad0b", mark: "🌇", count: false },
  gyo: { label: "業確", dot: "#7c3aed", mark: "📌", count: true },
  paid: { label: "有給", dot: "#dc2626", mark: "🐼", count: false },
  other: { label: "自由記述", dot: "#0ea5e9", mark: "rain-j", count: false },
  out: { label: "外出（客先訪問）", dot: "#0d9488", count: true, def: ["10:00", "16:00"] },
  shift: { label: "遅出", dot: "#7c3aed", count: true, def: ["11:00", "20:00"] },
  custom: { label: "", dot: "#3b82f6", count: false },
};

// マークの「文字の雨」（小さな四角の中を、文字がゆっくり下から上へ流れる）
const RAINS = {
  "rain-j": {
    name: "文字の雨（がじゅまる）",
    cls: "rain-j",
    txt: "がじゅまる・ガジュマル・がじゅまる・ガジュマル・",
  },
};

// 自由記述のマーク「文字の雨」の HTML を作る（id は RAINS のキー。例："rain-j"）
function rainHTML(id) {
  const rain = RAINS[id];

  // 文字を縦に並べた列を2本作り、少しずらして流す
  const columns = [];
  for (let k = 0; k < 2; k++) {
    const text = rain.txt.slice(k * 11) + rain.txt.slice(0, k * 11); // 2本目は文字の始まりをずらす
    const verticalText = [...text].join("<br>"); // 1文字ずつ改行して縦書きにする
    const style = `left:${6 + k * 48}%;animation-delay:-${k * 10}s;animation-duration:${24 + k * 6}s`;
    columns.push(`<i style="${style}">${verticalText}</i>`);
  }
  return `<span class="rain ${rain.cls}">${columns.join("")}</span>`;
}

// 予定の項目のマーク（絵文字、または文字の雨）を <span> で囲んで返す
function markHTML(mark) {
  const inner = RAINS[mark] ? rainHTML(mark) : mark;
  return `<span class="mark" aria-hidden="true">${inner}</span>`;
}

// 予定登録の画面に、いつも並べる8項目（この順番で表示する）
const BASE_ITEMS = ["work", "home", "paid", "am", "pm", "gyo", "health", "other"];

// 予定表での見た目（色のクラス・アイコン・マーク・表示名）。出社は「通常勤務」と表示する
const CHIP_STYLES = {
  normal: { label: "通常勤務", cls: "t-normal", icon: "normal", mark: "🏢" },
  shift: { label: "遅出", cls: "t-shift", icon: "shift" },
  out: { label: "外出（客先訪問）", cls: "t-out", icon: "out" },
  am: { label: "午前休", cls: "t-late", icon: "am", mark: "☀️" },
  pm: { label: "午後休", cls: "t-oth", icon: "pm", mark: "🌇" },
  gyo: { label: "業確", cls: "t-shift", icon: "gyo", mark: "📌" },
  home: { label: "在宅", cls: "t-out", icon: "home", mark: "🏠" },
  health: { label: "健康診断", cls: "t-early", icon: "health", mark: "🏥" },
  paid: { label: "有給", cls: "t-gyo", icon: "paid", mark: "🐼" },
  other: { label: "自由記述", cls: "t-leave", icon: "other", mark: "rain-j" },
  custom: { label: "", cls: "t-cus", icon: "tag" },
};

/* =========================================================
   2. メンバー（研修用のダミー。DB とつなぐまでは、ここが元データ）
   ========================================================= */

// メンバーID → メールアドレスの @ の前
const ROMA = {
  m01: "aoki.hanako",
  m02: "kato.misaki",
  m03: "kobayashi.tatsuya",
  m04: "sato.kenta",
  m05: "suzuki.ichiro",
  m06: "takahashi.kenta",
  m07: "tanaka.naoki",
  m08: "nakamura.miho",
  m09: "yamada.taro",
  m10: "yamamoto.yuka",
  m11: "yoshida.sakura",
  m12: "watanabe.ryo",
  m13: "inoue.tsubasa",
};

// メンバーの一覧。[ID, 名前, ふりがな（カタカナ）, 部署] から、メンバーのデータを作る
const MEMBERS = [
  ["m01", "青木 花子", "アオキ ハナコ", "総務部"],
  ["m02", "加藤 美咲", "カトウ ミサキ", "営業1課"],
  ["m03", "小林 竜也", "コバヤシ タツヤ", "システム課"],
  ["m04", "佐藤 健太", "サトウ ケンタ", "営業1課"],
  ["m05", "鈴木 一郎", "スズキ イチロウ", "システム課"],
  ["m06", "高橋 健太", "タカハシ ケンタ", "営業2課"],
  ["m07", "田中 直樹", "タナカ ナオキ", "サポート課"],
  ["m08", "中村 みほ", "ナカムラ ミホ", "総務部"],
  ["m09", "山田 太郎", "ヤマダ タロウ", "営業2課"],
  ["m10", "山本 由香", "ヤマモト ユカ", "サポート課"],
  ["m11", "吉田 さくら", "ヨシダ サクラ", "システム課"],
  ["m12", "渡辺 涼", "ワタナベ リョウ", "サポート課"],
  ["m13", "井上 翼", "イノウエ ツバサ", "営業2課"], // デモ用：ログインしたときに自動で削除されるメンバー
].map(([id, name, kana, dept]) => {
  // 勤務システムと所定時間（鈴木さんは早番、吉田さんは遅番、ほかは標準）
  let workSystem = ["標準勤務", "09:00", "18:00"];
  if (id === "m05") workSystem = ["早番勤務", "08:30", "17:30"];
  if (id === "m11") workSystem = ["遅番勤務", "10:00", "19:00"];

  return {
    id: id,
    mail: ROMA[id] + "@example.com",
    name: name,
    kana: kana,
    dept: dept,
    teams: name,
    sys: workSystem[0], // 勤務システムの名前
    sched: [workSystem[1], workSystem[2]], // 所定の開始・終了
  };
});

// 並び替えに使う文字（ふりがながあればふりがな、なければ名前）
function sortKey(member) {
  return member.kana || member.name;
}

// メンバーを50音順に並べ替える
function sortMembers() {
  MEMBERS.sort((a, b) => sortKey(a).localeCompare(sortKey(b), "ja"));
}

// 50音の行（ア行・カ行…）の文字と、その行のアイコンの色
const GYOU = [
  ["アイウエオ", "#4f8ff0"],
  ["カキクケコガギグゲゴ", "#5f9a6a"],
  ["サシスセソザジズゼゾ", "#e0567f"],
  ["タチツテトダヂヅデド", "#2a9fb0"],
  ["ナニヌネノ", "#f08a3c"],
  ["ハヒフヘホバビブベボパピプペポ", "#c27c3e"],
  ["マミムメモ", "#8a6fd1"],
  ["ヤユヨ", "#1d9a8f"],
  ["ラリルレロ", "#5b7bd5"],
  ["ワヲン", "#8c5fd6"],
];

// ふりがなの1文字目から、アイコンの色を決める（どの行にもなければ灰色）
function avColor(kanaText) {
  const firstChar = kanaText[0];
  for (const [chars, color] of GYOU) {
    if (chars.includes(firstChar)) {
      return color;
    }
  }
  return "#667085";
}

// メンバーのアイコンの色（色を選んでいなければ、ふりがなの行で自動に決まる）
function memberColor(member) {
  if (state.colors && state.colors[member.id]) {
    return state.colors[member.id];
  }
  return avColor(sortKey(member));
}

// メンバーの丸いアイコン（ふりがなの1文字目）の HTML を作る（small が true なら小さいアイコン）
function avatar(member, small) {
  const sizeClass = small ? " sm" : "";
  return `<span class="av${sizeClass}" style="background:${memberColor(member)}" aria-hidden="true">${sortKey(member)[0]}</span>`;
}

/* =========================================================
   3. 日付・時刻の便利な関数
   ========================================================= */

// 今日の日付（パソコンの日付から取る。時刻は 0:00 にそろえる）
const TODAY = (() => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
})();

// 曜日の文字（Date の getDay() の 0〜6 に対応。WEEKDAY_NAMES[0] は "日"）
const WEEKDAY_NAMES = "日月火水木金土";

// 数字を2けたにそろえる（例：3 → "03"）
function pad2(number) {
  return String(number).padStart(2, "0");
}

// 日付を "YYYY-MM-DD" の文字にする（例：2026年10月21日 → "2026-10-21"）
function toDateText(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

// n 日後の日付を返す（n がマイナスなら n 日前）。元の日付は変えない
function addDays(date, n) {
  const result = new Date(date);
  result.setDate(result.getDate() + n);
  return result;
}

// その日を含む週の月曜日を返す
function mondayOf(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysFromMonday = (result.getDay() + 6) % 7; // 月曜＝0、火曜＝1 … 日曜＝6
  result.setDate(result.getDate() - daysFromMonday);
  return result;
}

// 2つの日付が同じ日か
function sameDay(a, b) {
  return toDateText(a) === toDateText(b);
}

// "HH:MM" を、0時からの分に変える（例："09:30" → 570）
function toMinutes(timeText) {
  const [hour, minute] = timeText.split(":").map(Number);
  return hour * 60 + minute;
}

// 分を "HH:MM" にする（例：570 → "09:30"）
function toTimeText(minutes) {
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

// 画面に出す時刻：先頭の0を取る（例："09:00" → "9:00"）
function displayTime(timeText) {
  return timeText.replace(/^0/, "");
}

/* =========================================================
   4. 予定のデータ
   ========================================================= */

// 予定1件のデータを作る
//   item … 項目コード（work・home など）、start・end … "HH:MM"
//   note … 自由記述の項目名（任意）、memo … 備考（任意）
function newEntry(item, start, end, note, memo) {
  return { item: item, start: start, end: end, note: note || "", memo: memo || "" };
}

// 2026/10/19 の週は、画面のモックアップと同じ予定を出す（キーは "メンバーID|日付"）
const FIXED = {
  "m01|2026-10-21": [newEntry("work", "09:45", "18:00")],
  "m02|2026-10-23": [newEntry("work", "09:00", "15:00")],
  "m04|2026-10-20": [newEntry("gyo", "09:00", "12:00"), newEntry("work", "13:00", "18:00")],
  "m06|2026-10-22": [newEntry("work", "09:25", "18:00")],
  "m07|2026-10-21": [newEntry("work", "09:15", "18:00")],
  "m07|2026-10-23": [newEntry("work", "09:00", "16:00")],
  "m08|2026-10-22": [newEntry("other", "11:00", "20:00", "遅出")],
  "m09|2026-10-23": [newEntry("home", "09:00", "18:00")],
  "m10|2026-10-23": [newEntry("work", "10:15", "18:00")],
  "m12|2026-10-20": [newEntry("work", "09:00", "15:30")],
  "m03|2026-10-21": [newEntry("work", "09:30", "18:00")],
  "m10|2026-10-22": [newEntry("am", "09:00", "12:00"), newEntry("work", "13:00", "18:00")],
  "m02|2026-10-21": [newEntry("work", "09:00", "12:00"), newEntry("pm", "13:00", "18:00")],
  "m11|2026-10-19": [newEntry("paid", "10:00", "19:00")],
};

// モックアップと同じ予定を出す週（月曜〜日曜）
const MOCK_WEEK = ["2026-10-19", "2026-10-25"];

// 文字から 0 以上 1 未満の数を作る（同じ文字なら、いつも同じ数になる）
// ダミーの予定を「ばらばら、でも開き直しても同じ」にするために使う
function rnd(text) {
  let x = 2166136261;
  for (let i = 0; i < text.length; i++) {
    x ^= text.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  x ^= x >>> 13;
  x = Math.imul(x, 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

// まだ保存していない日の、ダミーの予定を作る
//   ・土日 → 予定なし
//   ・画面で追加したメンバー → 平日は所定時間の出社
//   ・モックアップの週 → FIXED の予定（なければ所定時間の出社）
//   ・それ以外の週 → 多くは出社。ときどき遅刻・早退・在宅・有給などを混ぜる
function generate(memberId, dateText) {
  const date = new Date(dateText.slice(0, 4), dateText.slice(5, 7) - 1, dateText.slice(8));
  if (date.getDay() === 0 || date.getDay() === 6) {
    return []; // 土日
  }

  const key = memberId + "|" + dateText;
  const member = findMember(memberId);
  const [start, end] = member.sched;

  // 新しく追加したメンバーは、平日に所定時間の出社を入れておく
  if (member.registered) {
    return [newEntry("work", start, end)];
  }
  if (FIXED[key]) {
    return FIXED[key].map((entry) => ({ ...entry })); // コピーを返す（元のデータを変えないため）
  }
  if (dateText >= MOCK_WEEK[0] && dateText <= MOCK_WEEK[1]) {
    return [newEntry("work", start, end)];
  }

  // 0〜1 の数で、どの予定にするかを決める
  const r = rnd(key);
  const r2 = rnd(key + "#");
  if (r < 0.06) {
    // 遅れて出社（15〜75分）
    const lateMinutes = [15, 25, 30, 45, 75][Math.floor(r2 * 5)];
    return [newEntry("work", toTimeText(toMinutes(start) + lateMinutes), end)];
  }
  if (r < 0.1) {
    // 早く帰る（90〜180分）
    const earlyMinutes = [180, 150, 120, 90][Math.floor(r2 * 4)];
    return [newEntry("work", start, toTimeText(toMinutes(end) - earlyMinutes))];
  }
  if (r < 0.13) {
    return [newEntry("other", "11:00", "20:00", "遅出")];
  }
  if (r < 0.17) {
    return [newEntry("home", start, end)]; // 在宅
  }
  if (r < 0.2) {
    // 業確（3時間）のあと出社
    return [
      newEntry("gyo", start, toTimeText(toMinutes(start) + 180)),
      newEntry("work", toTimeText(toMinutes(start) + 240), end),
    ];
  }
  if (r < 0.23) {
    return [newEntry("paid", start, end)]; // 有給
  }
  if (r < 0.24) {
    return [newEntry("am", start, "12:00"), newEntry("work", "13:00", end)]; // 午前休
  }
  if (r < 0.25) {
    return [newEntry("work", start, "12:00"), newEntry("pm", "13:00", end)]; // 午後休
  }
  if (r < 0.26) {
    // 出社＋夕方に自由記述の予定
    const otherName = ["研修", "定例会議", "面談"][Math.floor(r2 * 3)];
    return [newEntry("work", start, end), newEntry("other", "16:00", "17:00", otherName)];
  }
  return [newEntry("work", start, end)];
}

// メンバーのその日の予定を返す（保存した予定があればそれ、なければダミーの予定）
function getEntries(memberId, dateText) {
  const key = memberId + "|" + dateText;
  if (state.edits[key]) {
    return state.edits[key].map((entry) => ({ ...entry })); // コピーを返す
  }
  return generate(memberId, dateText);
}

// 予定1件を予定表に出すときの見た目（色のクラス・マーク・表示名）を決める
function chipStyle(entry, member, entries) {
  if (entry.item === "work") {
    return { ...CHIP_STYLES.normal };
  }
  const style = { ...CHIP_STYLES[entry.item] };
  if (entry.item === "custom") {
    style.label = entry.note || "項目";
  }
  if (entry.item === "other") {
    style.label = entry.note || "自由記述";
  }
  return style;
}

/* =========================================================
   5. 画面の状態（state）と保存
   画面の状態はブラウザ（localStorage）に保存し、開き直しても残るようにする。
   ※ DB とつなぐ前の研修用のしくみ。製造で API とつないだら、DB から読むように変える。
   ========================================================= */

// ブラウザに保存するときの名前
const STORE = "standby-schedule-v5";

// スタンバイ期間外のまま、何か月たったら自動で削除するか（No14）
const DELETE_MONTHS = 6;

// 研修用：削除まで n 日になるように、「期間外になった日」を今日から逆算する
//   （いつ開いても、同じ見え方になるようにするため）
function offSince(n) {
  const sixMonthsAgo = new Date(
    TODAY.getFullYear(),
    TODAY.getMonth() - DELETE_MONTHS,
    TODAY.getDate(),
  );
  return toDateText(addDays(sixMonthsAgo, n));
}

// 研修用：スタンバイ期間外のメンバー（削除日が近い人・過ぎた人を用意する）
function demoInactive() {
  return {
    m12: { since: offSince(2) }, // 渡辺 涼   ：あと約3日で削除（お知らせに出る）
    m08: { since: offSince(7) }, // 中村 みほ ：あと約8日で削除（お知らせに出る）
    m05: { since: offSince(10) }, // 鈴木 一郎 ：あと約11日で削除（お知らせに出る）
    m11: { since: offSince(60) }, // 吉田 さくら：期間外だが削除はまだ先（お知らせには出ない）
    m13: { since: offSince(-5) }, // 井上 翼   ：削除日を過ぎている → ログインしたときに自動で削除される
  };
}

// 研修用：前に削除されたメンバーの記録（お知らせの「削除済み」に出る）
//   [名前, 何日前に削除したか, 手動で削除したなら true]
//   この1か月に削除された20人 ＋ 1か月より前の1人（お知らせには出ない）
const DEMO_DELETED = [
  ["前田 健一", 20],
  ["石川 真由", 1, true],
  ["森本 拓海", 2],
  ["西村 彩", 3],
  ["松井 大和", 4, true],
  ["岡田 美穂", 5],
  ["藤田 翔", 6],
  ["長谷川 恵", 8],
  ["村上 颯太", 9, true],
  ["近藤 千尋", 11],
  ["坂本 陽菜", 12],
  ["遠藤 悠真", 14],
  ["青山 理沙", 15, true],
  ["福田 蓮", 17],
  ["太田 結衣", 18],
  ["三浦 大地", 21],
  ["原田 美咲", 23, true],
  ["小松 健", 25],
  ["中島 花音", 27],
  ["横山 隼人", 29],
  ["岡本 大輔", 45], // 1か月より前なので、お知らせには出ない
];

// 研修用：削除の記録を、今日から数えた日付で作る（新しい順）
function demoDeletedLog() {
  const logs = DEMO_DELETED.map(([name, daysAgo, manual]) => {
    return { name: name, date: toDateText(addDays(TODAY, -daysAgo)), manual: !!manual };
  });
  logs.sort((a, b) => (a.date < b.date ? 1 : -1)); // 新しい順
  return logs;
}

// ブラウザに保存してあるデータを読み込む（ないとき・壊れていたときは空から始める）
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem(STORE) || "{}") || {};
} catch (error) {
  saved = {};
}

// 画面で追加したメンバーを、メンバーの一覧に戻す
(saved.members || []).forEach((addedMember) => {
  const alreadyExists = MEMBERS.some((member) => member.id === addedMember.id);
  if (!alreadyExists) {
    MEMBERS.push(addedMember);
  }
});

// 画面で変更した名前・ふりがなを戻す（{ メンバーID: { name, kana } }）
Object.entries(saved.renamed || {}).forEach(([id, renamed]) => {
  const member = MEMBERS.find((m) => m.id === id);
  if (member) {
    member.name = renamed.name;
    member.kana = renamed.kana;
    member.teams = renamed.name;
  }
});

sortMembers();

// 画面の状態
const state = {
  user: saved.user || null, // ログイン中のユーザーの ID（"u" ＋ 利用者ID）。メンバーとは結び付けない
  week: mondayOf(TODAY), // 予定表に表示中の週（月曜日）
  q: "", // メンバーの検索欄の文字
  set: Object.assign({ activeOpen: true, inactiveOpen: true }, saved.set || {}), // 一覧の欄の開き・閉じなど
  pick: saved.pick || {}, // 期間外の人で「カレンダーに表示」にした人 { メンバーID: true/false }
  sel: {}, // メンバー一覧で☑を入れた人（まだボタンで反映していない） { メンバーID: true/false }
  renamed: saved.renamed || {}, // 変更した名前・ふりがな { メンバーID: { name, kana } }
  edits: saved.edits || {}, // 保存した予定 { "メンバーID|日付": [予定, …] }
  members: saved.members || [], // 画面で追加したメンバー
  colors: saved.colors || {}, // 選んだアイコンの色 { メンバーID: 色 }
  inactive: saved.inactive || demoInactive(), // スタンバイ期間外の人 { メンバーID: { since: 期間外になった日 } }
  lastAdded: saved.lastAdded || {}, // 最後に予定を保存した日 { メンバーID: "YYYY-MM-DD" }
  deleted: saved.deleted || [], // 削除したメンバーのID
  deletedLog: saved.deletedLog || demoDeletedLog(), // 削除の記録 [{ name, date, manual }]
  notified: saved.notified || {}, // ログイン時にお知らせ済みの削除予定 { ログインした人のID: { メンバーID: 削除日 } }
  notiRead: saved.notiRead || {}, // お知らせ一覧で見た削除予定 { ログインした人のID: { メンバーID: 削除日 } }
  users: saved.users || [],
  calYear: TODAY.getFullYear(), // 年間カレンダーに表示中の年
};

// 古い保存の形（true だけ）を、今の形（{ since: 日付 }）に直す
for (const id in state.inactive) {
  if (state.inactive[id] === true) {
    state.inactive[id] = { since: toDateText(TODAY) };
  }
}

// 最初から入っているメンバー（研修用の「初期状態に戻す」で使う）
const BUILTIN = [...MEMBERS];

// 削除したメンバーを、メンバーの一覧から外す
for (const id of state.deleted) {
  const index = MEMBERS.findIndex((member) => member.id === id);
  if (index >= 0) {
    MEMBERS.splice(index, 1);
  }
}

// 画面の状態（state）をブラウザに保存する（変更したら呼ぶ）
function persist() {
  const data = {
    user: state.user,
    set: state.set,
    edits: state.edits,
    members: state.members,
    colors: state.colors,
    inactive: state.inactive,
    lastAdded: state.lastAdded,
    deleted: state.deleted,
    deletedLog: state.deletedLog,
    notified: state.notified,
    notiRead: state.notiRead,
    users: state.users,
    pick: state.pick,
    renamed: state.renamed,
  };
  try {
    localStorage.setItem(STORE, JSON.stringify(data));
  } catch (error) {
    // 保存できない環境（シークレットウィンドウなど）では、保存せずに続ける
  }
}

/* =========================================================
   6. 画面の部品
   ========================================================= */

// 画面の要素を1つ探す（例：getElement("#loginPw")。document.querySelector と同じ）
function getElement(selector) {
  return document.querySelector(selector);
}

// HTML に入れる文字を安全にする（< > & " ' をそのまま表示される文字に置きかえる）
// 入力された文字を HTML に入れるときは、必ずこれを通す（画面を壊されないため）
function escapeHtml(text) {
  const replacements = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(text).replace(/[&<>"']/g, (char) => replacements[char]);
}

// メンバーID からメンバーを探す（見つからなければ undefined）
function findMember(id) {
  return MEMBERS.find((member) => member.id === id);
}

// 画面の下に、短いお知らせ（トースト）を2.2秒だけ出す
function toast(message) {
  document.querySelectorAll(".toast").forEach((old) => old.remove()); // 前のトーストは消す

  const box = document.createElement("div");
  box.className = "toast";
  box.textContent = message;
  box.setAttribute("role", "status");
  document.body.appendChild(box);

  setTimeout(() => box.remove(), 2200);
}

// ダイアログ・ポップアップを出す場所（index.html の <div id="layer">）
const layer = getElement("#layer");

// ダイアログ・ポップアップを開く（html をそのまま表示する。Esc キーで閉じられる）
function openLayer(html) {
  const wasNotiOpen = !!document.getElementById("notiPop");
  layer.innerHTML = html;
  if (wasNotiOpen) {
    markNotiRead(); // お知らせ一覧が閉じたので「見た」ことにする
  }
  document.addEventListener("keydown", escClose);
}

// 開いているダイアログ・ポップアップを閉じる
function closeLayer() {
  const wasNotiOpen = !!document.getElementById("notiPop");
  layer.innerHTML = "";
  if (wasNotiOpen) {
    markNotiRead(); // お知らせ一覧を閉じた瞬間に、ベルの数字を消す
  }
  document.removeEventListener("keydown", escClose);
}

// Esc キーでダイアログを閉じる
function escClose(event) {
  if (event.key === "Escape") {
    closeLayer();
  }
}

// ポップアップ（年間カレンダー・お知らせ）を、ボタンの右下にそろえて置く
//   pop … ポップアップの要素、anchor … 押したボタン
//   画面の左右からはみ出すときは、内側にずらす
function placePop(pop, anchor) {
  const anchorRect = anchor.getBoundingClientRect();
  const popWidth = pop.offsetWidth;
  const minLeft = 16 + window.scrollX;
  const maxLeft = window.scrollX + document.documentElement.clientWidth - popWidth - 16;

  let left = anchorRect.right + window.scrollX - popWidth; // ボタンの右端にそろえる
  left = Math.max(minLeft, Math.min(left, maxLeft));

  pop.style.left = left + "px";
  pop.style.top = anchorRect.bottom + window.scrollY + 8 + "px";
}

/* =========================================================
   7. ログイン系の画面（No1・No2・No9・No10）で共通
   ========================================================= */

// ログイン系の画面の id（このうち1つだけを表示する）
const AUTH_SCREENS = ["login", "register", "forgot", "forgotSent", "reset", "resetInvalid"];

// ログイン系の画面を1つだけ表示する（ほかは隠す）。name は上の一覧のどれか
function showScreen(name) {
  for (const screenId of AUTH_SCREENS) {
    getElement("#" + screenId).hidden = screenId !== name;
  }
  window.scrollTo(0, 0); // 画面の一番上へ
}

// メールアドレスの形か（○○@○○.○○）
function isMail(text) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

// 入力欄の下にエラーを出す（message が "" ならエラーを消す）。エラーのある入力欄は赤枠にする
//   id      … 入力欄の id（例："regName"）。エラーを出す場所は id + "-err"
//   message … 出すエラーの文
function fieldErr(id, message) {
  const input = getElement("#" + id);
  const errorArea = getElement("#" + id + "-err");
  const hasError = message !== "";

  input.classList.toggle("bad", hasError);
  errorArea.textContent = message;
  errorArea.hidden = !hasError;
}

/* =========================================================
   8. サーバー（C#）との通信
   ========================================================= */

// サーバーの API を呼ぶ
//   method … "GET" / "POST" など、path … "/api/auth/login" など、body … 送るデータ（なくてもよい）
//   戻り値 … { ok: 成功なら true, status: HTTPステータス（200・401 など）, data: 返ってきた JSON }
//   使い方：const response = await api("POST", "/api/auth/login", { email: "…", password: "…" });
async function api(method, path, body) {
  const options = {
    method: method,
    credentials: "same-origin", // ログイン状態の Cookie をいっしょに送る
    headers: {},
  };
  if (body !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }

  const response = await fetch(path, options);

  // 返ってきた JSON を読む（中身が空のときなどは null のまま）
  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }
  return { ok: response.ok, status: response.status, data: data };
}

/* =========================================================
   9. 祝日（カレンダーで赤く表示する）
   ========================================================= */

// year 年 month 月の、第 k 月曜日は何日か（例：成人の日＝1月の第2月曜日）
function nthMonday(year, month, k) {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const firstMonday = 1 + ((8 - firstWeekday) % 7);
  return firstMonday + (k - 1) * 7;
}

// 祝日法の決まりどおりの祝日の名前（振替休日・国民の休日は含まない）。祝日でなければ ""
function baseHoliday(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 日付が決まっている祝日
  const fixedHolidays = {
    "1-1": "元日",
    "2-11": "建国記念の日",
    "2-23": "天皇誕生日",
    "4-29": "昭和の日",
    "5-3": "憲法記念日",
    "5-4": "みどりの日",
    "5-5": "こどもの日",
    "8-11": "山の日",
    "11-3": "文化の日",
    "11-23": "勤労感謝の日",
  };
  if (fixedHolidays[month + "-" + day]) {
    return fixedHolidays[month + "-" + day];
  }

  // 第◯月曜日の祝日（ハッピーマンデー）
  if (month === 1 && day === nthMonday(year, 1, 2)) return "成人の日";
  if (month === 7 && day === nthMonday(year, 7, 3)) return "海の日";
  if (month === 9 && day === nthMonday(year, 9, 3)) return "敬老の日";
  if (month === 10 && day === nthMonday(year, 10, 2)) return "スポーツの日";

  // 春分の日・秋分の日（毎年の計算式）
  const k = year - 1980;
  const leap = Math.floor(k / 4);
  if (month === 3 && day === Math.floor(20.8431 + 0.242194 * k - leap)) return "春分の日";
  if (month === 9 && day === Math.floor(23.2488 + 0.242194 * k - leap)) return "秋分の日";

  return "";
}

// 祝日の計算結果を覚えておく（同じ日を何度も計算しないため） { "YYYY-MM-DD": 祝日の名前 }
const HOL_CACHE = {};

// 祝日なら名前を返す（祝日でなければ ""）。振替休日・国民の休日も含む
function holidayName(date) {
  const key = toDateText(date);
  if (key in HOL_CACHE) {
    return HOL_CACHE[key];
  }

  let name = baseHoliday(date);

  // 振替休日：日曜日の祝日のあと、最初の祝日でない日
  if (!name) {
    let previous = addDays(date, -1);
    while (baseHoliday(previous)) {
      if (previous.getDay() === 0) {
        name = "振替休日";
        break;
      }
      previous = addDays(previous, -1);
    }
  }

  // 国民の休日：祝日と祝日にはさまれた日（日曜日を除く）
  if (!name && date.getDay() !== 0) {
    const isBetweenHolidays = baseHoliday(addDays(date, -1)) && baseHoliday(addDays(date, 1));
    if (isBetweenHolidays) {
      name = "国民の休日";
    }
  }

  HOL_CACHE[key] = name;
  return name;
}

/* =========================================================
   10. 文字の変換
   ========================================================= */

// ひらがな → カタカナ（検索・並び替えで使う）。例："やまだ" → "ヤマダ"
function toKata(text) {
  return text.replace(/[ぁ-ゖ]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0x60));
}

// カタカナ → ひらがな（画面に出すとき・入力欄で使う）。例："ヤマダ" → "やまだ"
function toHira(text) {
  return (text || "").replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

// 空白をそろえる：全角空白を半角に、前後の空白を取り、続く空白を1つにする。例："山田　　太郎 " → "山田 太郎"
function spaces(text) {
  return text.replace(/　/g, " ").trim().replace(/\s+/g, " ");
}
