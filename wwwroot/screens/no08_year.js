/* =========================================================
   No8 年間カレンダー（日付選択）
   ヘッダーのカレンダーのボタンで開く、12か月分のカレンダー。
     ・日付を押す → その日を含む週を予定表に出す（処理は no03_calendar.js のクリックの振り分け）
     ・「＜」「＞」で前の年・次の年（今日の前後1年まで）
     ・表示できる期間（今日の前後1年）の外の日は押せない
   ========================================================= */
"use strict";

// 1日分のボタン（日付）の HTML を作る
//   選べる範囲：minDay 〜 maxDay（"YYYY-MM-DD"）、表示中の週：weekFrom 〜 weekTo
function yearDayHtml(date, minDay, maxDay, weekFrom, weekTo) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dateText = toDateText(date);
  const holiday = holidayName(date);

  // ボタンの見た目：祝日＝赤、表示中の週＝薄い青、今日＝紺の枠
  const classes = [];
  if (holiday) classes.push("hol");
  if (dateText >= weekFrom && dateText <= weekTo) classes.push("sel");
  if (sameDay(date, TODAY)) classes.push("td");

  // 範囲の外の日は押せなくする。範囲の中の日には data-date を付ける（押したときに使う）
  const isOutOfRange = dateText < minDay || dateText > maxDay;
  const clickPart = isOutOfRange
    ? ' disabled title="表示できる期間（今日の前後1年）の外です"'
    : ` data-date="${dateText}"`;

  const holidayLabel = holiday ? "（" + holiday + "）" : "";
  const holidayTitle = holiday ? ` title="${holiday}"` : "";

  return `<td><button class="${classes.join(" ")} num"${clickPart} aria-label="${year}年${month}月${day}日${holidayLabel}"${holidayTitle}>${day}</button></td>`;
}

// 1か月分のカレンダー（表）の HTML を作る（monthIndex は 0＝1月 〜 11＝12月）
function yearMonthHtml(year, monthIndex, minDay, maxDay, weekFrom, weekTo) {
  const html = [];
  html.push(`<div class="mon"><h4>${year}年${monthIndex + 1}月</h4><table><thead><tr>`);
  for (const weekdayName of "日月火水木金土") {
    html.push(`<th>${weekdayName}</th>`);
  }
  html.push(`</tr></thead><tbody><tr>`);

  // 1日が何曜日かに合わせて、前に空のマスを入れる
  const firstDay = new Date(year, monthIndex, 1);
  for (let i = 0; i < firstDay.getDay(); i++) {
    html.push("<td></td>");
  }

  // 1日〜月末まで。日曜日になったら行を変える
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day);
    if (date.getDay() === 0 && day > 1) {
      html.push("</tr><tr>");
    }
    html.push(yearDayHtml(date, minDay, maxDay, weekFrom, weekTo));
  }

  html.push("</tr></tbody></table></div>");
  return html.join("");
}

// 年間カレンダー（12か月分）の HTML を作る（表示する年は state.calYear）
function calHTML() {
  const year = state.calYear;
  const thisYear = TODAY.getFullYear();
  const minDay = dayMin();
  const maxDay = dayMax();
  const weekFrom = toDateText(state.week);
  const weekTo = toDateText(addDays(state.week, 6));

  const html = [];

  // 見出し：「＜ 2026年 ＞」（前後1年より先へは進めない）
  const prevDisabled = year <= thisYear - 1 ? " disabled" : "";
  const nextDisabled = year >= thisYear + 1 ? " disabled" : "";
  html.push(`<div class="cal-head">`);
  html.push(
    `<button class="ghost" data-cal="-1" aria-label="前の年"${prevDisabled}>${ICONS.prev}</button>`,
  );
  html.push(`<b class="num">${year}年</b>`);
  html.push(
    `<button class="ghost" data-cal="1" aria-label="次の年"${nextDisabled}>${ICONS.next}</button>`,
  );
  html.push(`</div>`);

  // 12か月分
  html.push(`<div class="months">`);
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    html.push(yearMonthHtml(year, monthIndex, minDay, maxDay, weekFrom, weekTo));
  }
  html.push(`</div>`);

  // 下に今日の日付
  const todayText = `${TODAY.getFullYear()}/${pad2(TODAY.getMonth() + 1)}/${pad2(TODAY.getDate())}`;
  html.push(`<div class="cal-foot">今日: <span class="num">${todayText}</span></div>`);

  return html.join("");
}

// ヘッダーのカレンダーのボタン：年間カレンダーを開く（開いていれば閉じる）
getElement("#calBtn").addEventListener("click", (event) => {
  event.stopPropagation(); // 画面全体のクリック（閉じる処理）に伝えない

  if (document.getElementById("calPop")) {
    closeLayer();
    return;
  }

  state.calYear = state.week.getFullYear(); // 表示中の週の年から始める
  openLayer(
    `<div class="pop cal-pop" role="dialog" aria-label="日付を選択" id="calPop">${calHTML()}</div>`,
  );
  placePop(getElement("#calPop"), getElement("#calBtn"));
});
