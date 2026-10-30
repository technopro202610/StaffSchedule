/* =========================================================
   No3 カレンダー画面
   画面の構成
     ・ヘッダー　　　：表示中の週・前の週／次の週・今週・日付選択・お知らせ・ログアウト
     ・左　メンバー一覧：スタンバイ期間中／期間外の2つの欄（☑で選んでボタンで反映）
     ・右　予定表　　　：メンバー × 月〜日 の表（セルを押すと No4 予定登録が開く）
   このファイルにあるもの
     ・render()        … 画面全体を描き直す（データを変えたら必ず呼ぶ）
     ・renderList()    … 左のメンバー一覧を描き直す
     ・renderWeek()    … 右の予定表を描き直す
     ・画面全体のクリックの振り分け（どのボタンが押されたかを見て、各画面の処理を呼ぶ）
   ========================================================= */
"use strict";

/* =========================================================
   1. 表示する期間（前後1年）
   ========================================================= */

// 表示中の週の7日間（月曜〜日曜）を配列で返す
function visibleDays() {
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(state.week, i));
  }
  return days;
}

// 表示できる最初の週（今日の1年前の週の月曜日）
function weekMin() {
  const date = new Date(TODAY);
  date.setFullYear(date.getFullYear() - 1);
  return mondayOf(date);
}

// 表示できる最後の週（今日の1年後の週の月曜日）
function weekMax() {
  const date = new Date(TODAY);
  date.setFullYear(date.getFullYear() + 1);
  return mondayOf(date);
}

// 選べる最初の日（今日の1年前）を "YYYY-MM-DD" で返す
function dayMin() {
  const date = new Date(TODAY);
  date.setFullYear(date.getFullYear() - 1);
  return toDateText(date);
}

// 選べる最後の日（今日の1年後）を "YYYY-MM-DD" で返す
function dayMax() {
  const date = new Date(TODAY);
  date.setFullYear(date.getFullYear() + 1);
  return toDateText(date);
}

// 表示中の週が、前後1年の範囲からはみ出さないようにする
function clampWeek() {
  if (state.week < weekMin()) {
    state.week = weekMin();
  }
  if (state.week > weekMax()) {
    state.week = weekMax();
  }
}

/* =========================================================
   2. メンバーの絞り込み・分類
   ========================================================= */

// 検索欄の文字で、メンバーを絞り込む（名前・ふりがなのどちらでも。空白は無視する）
function filtered() {
  const keyword = toKata(state.q.trim().replace(/\s/g, ""));
  if (keyword === "") {
    return MEMBERS; // 検索欄が空なら全員
  }
  return MEMBERS.filter((member) => {
    const nameAndKana = (member.name + member.kana).replace(/\s/g, "");
    return nameAndKana.includes(keyword);
  });
}

// スタンバイ期間中か（期間外の人は state.inactive に入っている）
function isActive(member) {
  return !state.inactive[member.id];
}

// カレンダー（予定表）に出すか
//   ・スタンバイ期間中の人 → いつも出す
//   ・スタンバイ期間外の人 → メンバー一覧の「カレンダーに表示」で選んだ人だけ出す
function isOnCalendar(member) {
  return isActive(member) || !!state.pick[member.id];
}

// 50音の行の名前（GYOU の並びと同じ順番）
const GYOU_NAMES = ["ア行", "カ行", "サ行", "タ行", "ナ行", "ハ行", "マ行", "ヤ行", "ラ行", "ワ行"];

// メンバーが50音のどの行か（ふりがなの1文字目で決める。濁音は清音の行に入る）
function gyouOf(member) {
  const firstChar = sortKey(member)[0];
  const index = GYOU.findIndex(([chars]) => chars.includes(firstChar));
  if (index < 0) {
    return "その他";
  }
  return GYOU_NAMES[index];
}

// 並んだメンバーの i 番目で、50音の行が変わるか（変わるところに見出しを入れる）
function newGroup(members, i) {
  if (i === 0) {
    return true;
  }
  return gyouOf(members[i - 1]) !== gyouOf(members[i]);
}

/* =========================================================
   3. 画面全体を描き直す
   ========================================================= */

// ヘッダーの高さ（画面の幅で折り返すと変わる）を CSS に渡す（予定表の高さの計算に使う）
function fitBoard() {
  const topbar = document.querySelector(".topbar");
  if (topbar) {
    document.documentElement.style.setProperty("--top-h", topbar.offsetHeight + "px");
  }
}

window.addEventListener("resize", fitBoard);

// メンバー一覧の表示・非表示（ヘッダー左のボタン）を画面に反映する
function applySide() {
  const isOpen = state.set.sideOpen !== false;
  const button = getElement("#sideBtn");

  document.querySelector(".main").classList.toggle("side-closed", !isOpen);
  button.setAttribute("aria-expanded", String(isOpen));

  const label = isOpen ? "メンバー一覧を隠す" : "メンバー一覧を表示";
  button.setAttribute("aria-label", label);
  button.title = label;
}

// ヘッダー左の「メンバー一覧」ボタン：一覧を隠す／出す
getElement("#sideBtn").addEventListener("click", () => {
  state.set.sideOpen = state.set.sideOpen === false;
  persist();
  render();
});

// 画面全体を描き直す（期間の表示・ボタンの状態・メンバー一覧・予定表・お知らせの数字）
function render() {
  clampWeek();

  // 範囲の端の週では「前の週」「次の週」を押せなくする
  getElement("#prevBtn").disabled = toDateText(state.week) <= toDateText(weekMin());
  getElement("#nextBtn").disabled = toDateText(state.week) >= toDateText(weekMax());

  fitBoard();
  applySide();
  updateNotiBadge();

  // 表示中の期間（例：2026年10月19日 (月) 〜 10月25日 (日)）
  const start = state.week;
  const end = addDays(state.week, 6);
  const startText = `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 (${WEEKDAY_NAMES[start.getDay()]})`;
  const endText = `${end.getMonth() + 1}月${end.getDate()}日 (${WEEKDAY_NAMES[end.getDay()]})`;
  getElement("#periodLabel").textContent = `${startText} 〜 ${endText}`;

  renderList();
  renderWeek();
}

/* =========================================================
   4. 左のメンバー一覧
   ========================================================= */

// メンバー一覧の1行（☑・名前・ふりがな・バッジ）の HTML を作る
//   isActiveSection … スタンバイ期間中の欄なら true、期間外の欄なら false
function memberRowHtml(member, isActiveSection) {
  const name = escapeHtml(member.name);
  const kana = member.kana ? escapeHtml(toHira(member.kana)) : "";

  // 右側のバッジ：期間外の欄だけ。カレンダーに出している人には「表示中」、さらに「期間外」のバッジ
  let badges = "";
  if (!isActiveSection) {
    if (isOnCalendar(member)) {
      badges += `<span class="badge-show">表示中</span>`;
    }
    badges += offBadge(member);
  }

  // 左側のチェックボックス
  const checked = isSelected(member) ? " checked" : "";
  const checkbox = `<label class="mchk"><input type="checkbox" data-pick="${member.id}"${checked} aria-label="${name} を選択"></label>`;

  // 名前のボタン（押すと No5 メンバー編集が開く）
  const buttonClasses = ["mitem"];
  if (!isActiveSection) buttonClasses.push("inactive");
  const title = kana ? `${name}（${kana}）` : name;
  const kanaHtml = kana ? `<small>${kana}</small>` : "";

  const html = [];
  html.push(`<li class="mrow${isActiveSection ? "" : " off"}">`);
  html.push(checkbox);
  html.push(
    `<button class="${buttonClasses.join(" ")}" data-member="${member.id}" title="${title}">`,
  );
  html.push(`<span class="mname"><b>${name}</b>${kanaHtml}</span>`);
  html.push(badges);
  html.push(ICONS.chev);
  html.push(`</button>`);
  html.push(`</li>`);
  return html.join("");
}

// メンバー一覧の行を、50音の見出し（ア行・カ行…）を入れながら並べる
function listGrouped(members, isActiveSection) {
  const html = [];
  members.forEach((member, i) => {
    if (newGroup(members, i)) {
      html.push(`<li class="grp-sep"><span>${gyouOf(member)}</span></li>`);
    }
    html.push(memberRowHtml(member, isActiveSection));
  });
  return html.join("");
}

// 欄にだれもいないときの文
function emptyListHtml(sectionName) {
  if (state.q.trim() !== "") {
    return `<li class="empty-list">「${escapeHtml(state.q)}」に一致する${sectionName}のメンバーはいません。</li>`;
  }
  return `<li class="empty-list">${sectionName}のメンバーはいません。</li>`;
}

// 左のメンバー一覧（スタンバイ期間中・期間外の2つの欄）を描き直す
function renderList() {
  const members = filtered();
  const activeMembers = members.filter(isActive);
  const inactiveMembers = members.filter((member) => !isActive(member));
  const html = [];

  // ---- 欄1：スタンバイ期間中（0人でも見出しはいつも出す）----
  const activeOpen = state.set.activeOpen;
  html.push(`<li class="list-sep sep-act">`);
  html.push(
    `<label class="sep-chk"><input type="checkbox" data-pick-all="act" aria-label="スタンバイ期間中のメンバーをまとめて選択">スタンバイ期間中 ${activeMembers.length}名</label>`,
  );
  html.push(
    `<button class="link sep-btn" id="activeToggle" aria-expanded="${activeOpen}">${activeOpen ? "とじる" : "ひらく"}</button>`,
  );
  html.push(
    `<span class="sep-actions"><button class="mini-btn" data-stby-to="act">スタンバイ期間外</button></span>`,
  );
  html.push(`</li>`);
  if (activeOpen) {
    if (activeMembers.length > 0) {
      html.push(listGrouped(activeMembers, true));
    } else {
      html.push(emptyListHtml("スタンバイ期間中"));
    }
  }

  // ---- 欄2：スタンバイ期間外 ----
  const inactiveOpen = state.set.inactiveOpen;
  html.push(`<li class="list-sep sep-ina">`);
  html.push(
    `<label class="sep-chk"><input type="checkbox" data-pick-all="ina" aria-label="スタンバイ期間外のメンバーをまとめて選択">スタンバイ期間外</label>`,
  );
  html.push(
    `<button class="link sep-btn" id="inactiveToggle" aria-expanded="${inactiveOpen}">${inactiveOpen ? "とじる" : "ひらく"}</button>`,
  );
  html.push(
    `<span class="sep-actions"><button class="mini-btn" data-apply="ina">カレンダーに表示</button><button class="mini-btn" data-stby-to="ina">スタンバイ期間中</button></span>`,
  );
  html.push(`</li>`);
  if (inactiveOpen) {
    if (inactiveMembers.length > 0) {
      html.push(listGrouped(inactiveMembers, false));
    } else {
      html.push(emptyListHtml("スタンバイ期間外"));
    }
  }

  const list = getElement("#memberList");
  list.innerHTML = html.join("");

  // ---- 見出しのチェックとボタンの状態をそろえる ----
  updateSectionControls(list, "act", activeMembers);
  updateSectionControls(list, "ina", inactiveMembers);
}

// 欄の見出しのチェックとボタンの状態を決める
//   見出しのチェック：全員☑＝☑、一部だけ＝－（途中）、だれも☑なし＝□、欄にだれもいない＝押せない
function updateSectionControls(list, sectionKey, members) {
  const headerBox = list.querySelector(`[data-pick-all="${sectionKey}"]`);
  if (!headerBox) {
    return;
  }

  const selectedCount = members.filter(isSelected).length;
  headerBox.checked = members.length > 0 && selectedCount === members.length;
  headerBox.indeterminate = selectedCount > 0 && selectedCount < members.length;
  headerBox.disabled = members.length === 0;

  // 欄にだれもいなければ、欄のボタンも押せなくする
  const buttons = list.querySelectorAll(
    `[data-apply="${sectionKey}"],[data-stby-to="${sectionKey}"]`,
  );
  buttons.forEach((button) => {
    button.disabled = members.length === 0;
  });

  // ☑を変えて、まだ「カレンダーに表示」を押していないときは、ボタンを目立たせる
  const applyButton = list.querySelector(`[data-apply="${sectionKey}"]`);
  if (applyButton) {
    applyButton.classList.toggle("pending", members.some(isSelected));
  }
}

/* =========================================================
   5. 右の予定表
   ========================================================= */

// 予定1件（色付きの札）の HTML を作る
//   備考があれば💬マークを付け、マウスを乗せると備考の全文をふきだしで出す（data-memo）
function chipHTML(entry, member, entries) {
  const style = chipStyle(entry, member, entries);
  const hasMemo = entry.memo ? true : false;

  // 札の左上：マーク（絵文字・文字の雨）か、アイコン
  const mark = style.mark ? markHTML(style.mark) : ICONS[style.icon];

  const html = [];
  html.push(`<span class="chip ${style.cls}${hasMemo ? " has-memo" : ""}"`);
  if (hasMemo) {
    html.push(` data-memo="${escapeHtml(entry.memo)}"`);
  }
  html.push(`>`);
  html.push(`<span class="lbl">${mark}${escapeHtml(style.label)}</span>`);
  html.push(`<span class="tm">${displayTime(entry.start)} - ${displayTime(entry.end)}</span>`);
  if (hasMemo) {
    html.push(`<span class="memo-ic" aria-label="備考あり">${ICONS.memo}</span>`);
  }
  html.push(ICONS.caret);
  html.push(`</span>`);
  return html.join("");
}

// 予定表の名前は、6文字＋全角空白1文字（7文字）まで表示する
const NAME_MAX = 7;

// 予定表の名前の HTML。7文字を超えたら隠し、マウスを乗せると全部出す（data-full）
function nameCell(name) {
  // 姓と名の間の半角空白は、全角空白にそろえる
  const chars = [...String(name).replace(/ /g, "　")];
  const fullName = escapeHtml(chars.join(""));

  if (chars.length <= NAME_MAX) {
    return `<span class="mname7">${fullName}</span>`;
  }
  const shortName = escapeHtml(chars.slice(0, NAME_MAX).join(""));
  return `<span class="mname7 cut" tabindex="0" data-full="${fullName}" aria-label="${fullName}">${shortName}</span>`;
}

// 予定表のヘッダーの1日分（例：10/21 水）。日曜・祝日は赤、土曜は青、今日は紺の四角
function dayHeaderHtml(date) {
  const holiday = holidayName(date);
  let colorClass = "";
  if (date.getDay() === 0 || holiday) {
    colorClass = "sun";
  } else if (date.getDay() === 6) {
    colorClass = "sat";
  }
  const todayClass = sameDay(date, TODAY) ? " is-today" : "";
  const title = holiday ? ` title="${holiday}"` : "";
  return `<th class="${colorClass}${todayClass}"${title}><span class="d">${date.getMonth() + 1}/${date.getDate()}</span><span class="w">${WEEKDAY_NAMES[date.getDay()]}</span></th>`;
}

// 予定表のセル1つ（メンバー1人の1日分）
function dayCellHtml(member, date) {
  const dateText = toDateText(date);
  const entries = getEntries(member.id, dateText);
  const isWeekendDay = date.getDay() === 0 || date.getDay() === 6;
  const key = member.id + "|" + dateText;
  const name = escapeHtml(member.name);
  const monthDay = `${date.getMonth() + 1}月${date.getDate()}日`;

  // セルの色：土日は灰色、今日は薄い青
  const classes = ["dcell"];
  if (isWeekendDay) classes.push("wkend");
  if (sameDay(date, TODAY)) classes.push("today-col");

  // スタンバイ期間中なのに、平日の予定がない →「未入力」（赤）
  const isMissing = entries.length === 0 && !isWeekendDay && isActive(member);
  if (isMissing) classes.push("missing-cell");

  // 予定が2件以上の日：予定のかわりに「予定 n件 / 全件表示」ボタンを出す（押すとプルダウン）
  if (entries.length > 1) {
    return `<td class="${classes.join(" ")}"><button class="more-btn" data-more="${key}" aria-haspopup="dialog" aria-label="${name} ${monthDay}の予定 ${entries.length}件をすべて表示"><span class="more-n">予定 ${entries.length}件</span><span class="more-sub">全件表示${ICONS.caret}</span></button></td>`;
  }

  // 予定が0件・1件の日：セル全体がボタン（押すと No4 予定登録が開く）
  let inner;
  if (entries.length === 1) {
    inner = chipHTML(entries[0], member, entries);
  } else if (isMissing) {
    inner = `<span class="missing">未入力</span>`;
  } else {
    inner = `<span class="dash">-</span>`;
  }
  const offTitle = isActive(member) ? "" : ' title="スタンバイ期間外（予定は編集できます）"';
  const ariaLabel = `${member.name} ${monthDay}の予定を編集`;
  return `<td class="${classes.join(" ")}"><button class="cellbtn" data-edit="${member.id}|${dateText}" aria-label="${ariaLabel}"${offTitle}>${inner}</button></td>`;
}

// 右の予定表（メンバー × 月〜日）を描き直す
//   並び順：スタンバイ期間中（50音順）→ その下に期間外（50音順）
function renderWeek() {
  const days = visibleDays();
  const shownMembers = filtered().filter(isOnCalendar);
  const activeMembers = shownMembers.filter(isActive);
  const inactiveMembers = shownMembers.filter((member) => !isActive(member));
  const rows = [...activeMembers, ...inactiveMembers];
  const columnCount = days.length + 1; // 名前の列 + 7日分

  const html = [];

  // ---- 見出しの行 ----
  html.push(`<table class="grid"><thead><tr><th class="mcol">メンバー</th>`);
  days.forEach((date) => {
    html.push(dayHeaderHtml(date));
  });
  html.push(`</tr></thead><tbody>`);

  if (rows.length === 0) {
    html.push(
      `<tr class="no-rows"><td colspan="${columnCount}">該当するメンバーがいません。</td></tr>`,
    );
  }

  // ---- メンバーごとの行 ----
  rows.forEach((member, i) => {
    const isFirstInactive = i === activeMembers.length;

    // 期間外の人の最初の行の上に「スタンバイ期間外」の帯を入れる
    if (isFirstInactive && i > 0) {
      html.push(
        `<tr class="grp grp-off"><th colspan="${columnCount}" scope="colgroup"><span>スタンバイ期間外</span></th></tr>`,
      );
    }
    // 50音の行が変わるところに「ア行」「カ行」…の帯を入れる
    if (isFirstInactive || newGroup(rows, i)) {
      html.push(
        `<tr class="grp"><th colspan="${columnCount}" scope="colgroup"><span>${gyouOf(member)}</span></th></tr>`,
      );
    }

    // 名前のセル（期間外の人は灰色＋「期間外」のバッジ）
    const active = isActive(member);
    html.push(active ? `<tr>` : `<tr class="row-off">`);
    const offBadgeHtml = active ? "" : `<span class="badge-off">期間外</span>`;
    html.push(
      `<td class="mcell"><div class="mcell-in${active ? "" : " off"}">${nameCell(member.name)}${offBadgeHtml}</div></td>`,
    );

    // 7日分のセル
    days.forEach((date) => {
      html.push(dayCellHtml(member, date));
    });
    html.push(`</tr>`);
  });

  html.push(`</tbody></table>`);
  getElement("#boardBody").innerHTML = html.join("");
}

// 予定を保存したマスに目印を付ける（どこに保存したか、ひと目で分かるように）
//   ぎゅいん（下線が伸びる）→ 背景が青に → ポン（札が弾む）→ 約6秒でふわっと消える。見た目は no03_calendar.css
//   key … "メンバーID|YYYY-MM-DD"
function flashCell(key) {
  const button = document.querySelector(`#boardBody [data-edit="${key}"], #boardBody [data-more="${key}"]`);
  if (!button) {
    return; // 表示中の週・表示中のメンバーでなければ何もしない
  }
  const cell = button.closest("td");
  cell.scrollIntoView({ block: "nearest", inline: "nearest" }); // 見えない位置なら、見える所までスクロール

  // 続けて保存したときも、最初からやり直す
  cell.classList.remove("just-saved");
  cell.querySelectorAll(".saved-bar").forEach((bar) => bar.remove());
  void cell.offsetWidth;

  // 下線（ぎゅいん）を足して、目印を付ける
  const bar = document.createElement("span");
  bar.className = "saved-bar";
  bar.setAttribute("aria-hidden", "true");
  cell.appendChild(bar);
  cell.classList.add("just-saved");

  // 約6秒たったら、目印を外す
  setTimeout(() => {
    cell.classList.remove("just-saved");
    bar.remove();
  }, 6100);
}

/* =========================================================
   6. 備考・長い名前のふきだし
   ========================================================= */

// ふきだしの箱を1つだけ作っておき、使い回す
const memoTip = document.createElement("div");
memoTip.className = "memo-tip";
memoTip.hidden = true;
document.body.appendChild(memoTip);

// 💬のある予定や、省略した名前の上にマウス（またはキーボードのフォーカス）が来たら、ふきだしを出す
function showTip(event) {
  const target = event.target.closest && event.target.closest(".chip.has-memo,.mname7.cut");
  if (!target) {
    memoTip.hidden = true;
    return;
  }

  // 中身：名前なら全部の名前、予定なら「備考」＋備考の全文
  if (target.dataset.full) {
    memoTip.innerHTML = escapeHtml(target.dataset.full);
  } else {
    memoTip.innerHTML = `<b>備考</b>${escapeHtml(target.dataset.memo)}`;
  }
  memoTip.hidden = false;

  // 置く場所：対象の真下（画面の下からはみ出すなら真上）
  const rect = target.getBoundingClientRect();
  const tipWidth = memoTip.offsetWidth;
  const tipHeight = memoTip.offsetHeight;
  const left = Math.max(8, Math.min(rect.left, innerWidth - tipWidth - 8));
  let top = rect.bottom + 6;
  if (rect.bottom + 6 + tipHeight > innerHeight) {
    top = rect.top - tipHeight - 6;
  }
  memoTip.style.left = left + "px";
  memoTip.style.top = top + "px";
}

document.addEventListener("mouseover", showTip);
document.addEventListener("focusin", showTip);

// 画面をスクロールしたら、ふきだしは消す
document.addEventListener(
  "scroll",
  () => {
    memoTip.hidden = true;
  },
  true,
);

/* =========================================================
   7. 「予定 n件 / 全件表示」のプルダウン
   ========================================================= */

// 「全件表示」ボタンの下に、その日の予定をすべてプルダウンで出す（予定を押すと No4 予定登録が開く）
function openMorePop(button) {
  const key = button.dataset.more; // "メンバーID|YYYY-MM-DD"
  const [memberId, dateText] = key.split("|");
  const member = findMember(memberId);
  const entries = getEntries(memberId, dateText);
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const name = escapeHtml(member.name);

  const chips = entries.map((entry) => chipHTML(entry, member, entries)).join("");

  openLayer(`<div class="pop more-pop" role="dialog" aria-label="${name}さんの予定" id="morePop" data-key="${key}"><h4>${month}/${day}（${WEEKDAY_NAMES[date.getDay()]}）${name}　${entries.length}件</h4>
    <button class="cellbtn" data-edit="${memberId}|${dateText}" aria-label="${name} ${month}月${day}日の予定を編集">${chips}</button></div>`);
  placeMorePop();
}

// プルダウンを「全件表示」ボタンの真下に置く。表をスクロールしてもボタンにくっついて動く
function placeMorePop() {
  const pop = document.getElementById("morePop");
  if (!pop) {
    return; // プルダウンが開いていない
  }
  const button = document.querySelector(`[data-more="${pop.dataset.key}"]`);
  if (!button) {
    closeLayer(); // ボタンがなくなった（週を移動した など）
    return;
  }

  const buttonRect = button.getBoundingClientRect();
  const boardRect = getElement("#boardBody").getBoundingClientRect();
  const headerCell = getElement("#boardBody thead th");
  const visibleTop = headerCell ? headerCell.getBoundingClientRect().bottom : boardRect.top;

  // ボタンが表の見える範囲から外れたら、プルダウンも隠す
  const isOutside =
    buttonRect.bottom < visibleTop ||
    buttonRect.top > boardRect.bottom ||
    buttonRect.right < boardRect.left ||
    buttonRect.left > boardRect.right;
  pop.style.visibility = isOutside ? "hidden" : "visible";

  // 横の位置：ボタンの左端にそろえる（画面の右からはみ出すなら左へずらす）
  const popWidth = pop.offsetWidth;
  const maxLeft = window.scrollX + document.documentElement.clientWidth - popWidth - 16;
  const left = Math.max(16, Math.min(buttonRect.left + window.scrollX, maxLeft));
  pop.style.left = left + "px";

  // 縦の位置：ふつうはボタンの真下に開く。
  //   下に入りきらないとき（表の一番下の行など）は、ボタンの真上に開く。
  //   上下どちらにも入りきらないときは、広いほうに開く（中身はスクロールできる）
  const popHeight = pop.offsetHeight;
  const spaceBelow = document.documentElement.clientHeight - buttonRect.bottom - 8;
  const spaceAbove = buttonRect.top - 8;
  const opensUp = popHeight + 4 > spaceBelow && spaceAbove > spaceBelow;
  const top = opensUp ? buttonRect.top - popHeight - 4 : buttonRect.bottom + 4;
  pop.style.top = Math.max(8, top) + window.scrollY + "px";
  pop.classList.toggle("opens-up", opensUp); // 上に開いているか（見た目の調整用）
}

getElement("#boardBody").addEventListener("scroll", placeMorePop);
window.addEventListener("scroll", placeMorePop);
window.addEventListener("resize", placeMorePop);

/* =========================================================
   8. ヘッダーのボタン・検索
   ========================================================= */

// 週を n 週ぶん動かす（n = -1 で前の週、1 で次の週）
function shift(n) {
  state.week = addDays(state.week, 7 * n);
  clampWeek();
  render();
}

// 「＜」前の週
getElement("#prevBtn").addEventListener("click", () => {
  shift(-1);
});

// 「＞」次の週
getElement("#nextBtn").addEventListener("click", () => {
  shift(1);
});

// 「今週」
getElement("#todayBtn").addEventListener("click", () => {
  state.week = mondayOf(TODAY);
  render();
});

// メンバーの検索欄：1文字入力するたびに描き直す
getElement("#searchInput").addEventListener("input", (event) => {
  state.q = event.target.value;
  render();
});

/* =========================================================
   9. 画面全体のクリックの振り分け
   メンバー一覧や予定表は描き直すたびに中身が作り直されるので、
   ボタン1つ1つではなく document で1回だけクリックを受け取り、
   押された場所（data-◯◯ の印）を見て、呼ぶ処理を決める。
   ========================================================= */
document.addEventListener("click", (event) => {
  const clicked = event.target;
  const openedLayer = layer.firstElementChild;

  // (1) プルダウン（全件表示・日付選択）が開いているときに外側を押したら、閉じるだけにする
  //     （ほかのセルの予定登録などは開かない）。同じ「全件表示」ボタンをもう一度押しても閉じる
  const openPop = openedLayer && openedLayer.classList.contains("pop") ? openedLayer : null;
  if (openPop && !clicked.closest(".pop")) {
    const moreButton = clicked.closest("[data-more]");
    const isSameButton = moreButton && openPop.dataset.key === moreButton.dataset.more;
    closeLayer();
    if (moreButton && !isSameButton) {
      openMorePop(moreButton); // 別の「全件表示」ボタンなら、そちらを開く
    }
    return;
  }

  // (2) No8 年間カレンダー：前の年・次の年
  const yearButton = clicked.closest("[data-cal]:not([disabled])");
  if (yearButton) {
    state.calYear += Number(yearButton.dataset.cal);
    getElement("#calPop").innerHTML = calHTML();
    return;
  }

  // (3) No8 年間カレンダー：日付を押した → その日を含む週を表示
  const dateButton = clicked.closest("[data-date]");
  if (dateButton) {
    const [year, month, day] = dateButton.dataset.date.split("-").map(Number);
    state.week = mondayOf(new Date(year, month - 1, day));
    closeLayer();
    render();
    return;
  }

  // (4) メンバー一覧の欄の「とじる／ひらく」
  if (clicked.closest("#activeToggle")) {
    state.set.activeOpen = !state.set.activeOpen;
    persist();
    renderList();
    return;
  }
  if (clicked.closest("#inactiveToggle")) {
    state.set.inactiveOpen = !state.set.inactiveOpen;
    persist();
    renderList();
    return;
  }

  // (5) メンバーの「追加」（No5）・「削除」（No13）
  if (clicked.closest("#addMemberBtn")) {
    openMemberForm();
    return;
  }
  if (clicked.closest("#delMemberBtn")) {
    askDelete();
    return;
  }

  // (6) 「カレンダーに表示」
  const applyButton = clicked.closest("[data-apply]");
  if (applyButton) {
    applyCal(applyButton.dataset.apply);
    return;
  }

  // (7) 「スタンバイ期間外」「スタンバイ期間中」（No6・No7）
  const standbyButton = clicked.closest("[data-stby-to]");
  if (standbyButton) {
    askStandby(standbyButton.dataset.stbyTo);
    return;
  }

  // (8) 予定表の「全件表示」ボタン
  const moreButton = clicked.closest("[data-more]");
  if (moreButton) {
    event.stopPropagation();
    openMorePop(moreButton);
    return;
  }

  // (9) 予定表のセル → No4 予定登録
  const cellButton = clicked.closest("[data-edit]");
  if (cellButton) {
    const [memberId, dateText] = cellButton.dataset.edit.split("|");
    openEditor(memberId, dateText);
    return;
  }

  // (10) メンバー一覧の名前 → No5 メンバー編集
  const memberButton = clicked.closest("[data-member]");
  if (memberButton) {
    openMemberForm(memberButton.dataset.member);
    return;
  }

  // (11) 研修用：ダミーデータを初期状態に戻す
  if (clicked.id === "resetData") {
    resetDummyData();
    return;
  }

  // (12) ダイアログの「キャンセル」や、ダイアログの外側（暗い部分）→ 閉じる
  if (clicked.closest("[data-close]") || clicked.classList.contains("scrim")) {
    closeLayer();
    return;
  }

  // (13) ポップアップの外側を押したら閉じる
  if (openedLayer && openedLayer.classList.contains("pop") && !clicked.closest(".pop")) {
    closeLayer();
  }
});

// 研修用：ダミーデータ（予定・追加したメンバー・期間外・削除の記録など）を初期状態に戻す
function resetDummyData() {
  state.edits = {};

  // 画面で追加したメンバーを消す
  for (const added of state.members) {
    const index = MEMBERS.findIndex((member) => member.id === added.id);
    if (index >= 0) MEMBERS.splice(index, 1);
  }
  state.members = [];
  state.colors = {};
  state.inactive = demoInactive();
  state.lastAdded = {};

  // 削除したメンバー（最初からいた人）を戻す
  for (const id of state.deleted) {
    const original = BUILTIN.find((member) => member.id === id && !member.addedMember);
    if (original && !MEMBERS.includes(original)) MEMBERS.push(original);
  }
  state.deleted = [];
  state.deletedLog = demoDeletedLog();
  state.notified = {};
  state.notiRead = {};
  sortMembers();
  state.pick = {};
  state.sel = {};

  persist();
  closeLayer();
  render();
  toast("ダミーデータを初期状態に戻しました");
}

/* =========================================================
   10. メンバー一覧のチェックボックス
   ☑は「選ぶ」だけ。カレンダーへの反映や期間の変更は、欄のボタンを押したときに行う。
   ========================================================= */
document.addEventListener("change", (event) => {
  // メンバー1人の☑
  const memberId = event.target.dataset.pick;
  if (memberId) {
    state.sel[memberId] = event.target.checked;
    renderList();
    return;
  }

  // 欄の見出しの☑（その欄の全員をまとめて選ぶ・外す）
  const sectionKey = event.target.dataset.pickAll;
  if (sectionKey) {
    sectionMembers(sectionKey).forEach((member) => {
      state.sel[member.id] = event.target.checked;
    });
    renderList();
  }
});
