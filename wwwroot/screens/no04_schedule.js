/* =========================================================
   No4 予定登録画面（ダイアログ）
   予定表のセルを押すと開く。1日分の予定を、表で登録・変更する。
     ・8項目（出社・在宅・有給・午前休・午後休・業確・健康診断・自由記述）が固定の順で並ぶ
     ・チェックを入れた行だけが保存される
     ・「項目を追加」で自由記述の行を増やせる
   データの流れ
     開く  ：getEntries()（保存済みの予定）→ buildRows() で表の行（draft.rows）を作る
     入力中：readRows() で画面の入力を draft.rows に読み込む
     保存  ：validate() でチェック → state.edits に保存 → render() で予定表を描き直す
   ========================================================= */
"use strict";

// 編集中のデータ（ダイアログを開いている間だけ使う）
//   { mid: メンバーID, ds: "YYYY-MM-DD", m: メンバー, rows: 表の行の配列, off: 期間外の人なら true }
//   表の1行：{ item: 項目コード, note: 自由記述の項目名, memo: 備考, on: チェック, base: 固定の8項目なら true, start, end }
let draft = null;

/* =========================================================
   1. 表の行を作る
   ========================================================= */

// "YYYY-MM-DD" が土日か
function isWeekend(dateText) {
  const [year, month, day] = dateText.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  return weekday === 0 || weekday === 6;
}

// 項目ごとの、はじめに入れておく時刻 [開始, 終了]
//   出社・在宅・有給 … 所定時間（例：09:00〜18:00）
//   午前休 … 所定の始まり〜12:00、午後休 … 13:00〜所定の終わり
//   それ以外 … 空
function defTime(itemCode, member) {
  const [workStart, workEnd] = member.sched;
  if (itemCode === "work" || itemCode === "home" || itemCode === "paid") {
    return [workStart, workEnd];
  }
  if (itemCode === "am") {
    return [workStart, "12:00"];
  }
  if (itemCode === "pm") {
    return ["13:00", workEnd];
  }
  return ["", ""];
}

// 予定登録の表の行を作る
//   1. 8項目の行を固定の順で作る（チェックなし・初期の時刻）
//   2. 登録済みの予定があれば、その行にチェックと時刻・備考を入れる
//      （同じ項目が2つ以上あるときや、項目が8項目にないときは、行を足す）
//   3. 予定が未登録の平日は「出社」にチェックを入れておく
function buildRows(member, entries, dateText) {
  const rows = BASE_ITEMS.map((itemCode) => {
    const [start, end] = defTime(itemCode, member);
    return { item: itemCode, note: "", memo: "", on: false, base: true, start: start, end: end };
  });

  entries.forEach((entry) => {
    // 同じ項目で、まだチェックが入っていない行を探す
    let row = null;
    if (entry.item !== "custom") {
      row = rows.find((r) => r.item === entry.item && !r.on);
    }
    if (!row) {
      row = { item: entry.item, note: "", base: false };
      rows.push(row);
    }
    row.on = true;
    row.start = entry.start;
    row.end = entry.end;
    row.note = entry.note || "";
    row.memo = entry.memo || "";
  });

  const isSaved = !!state.edits[member.id + "|" + dateText];
  if (entries.length === 0 && !isSaved && !isWeekend(dateText)) {
    rows[0].on = true; // 先頭の行＝出社
  }
  return rows;
}

// 行の項目名（自由記述は入力した名前。空なら「自由記述」）
function rowName(row) {
  if (row.item === "custom" || row.item === "other") {
    return row.note || "自由記述";
  }
  return ITEMS[row.item].label;
}

/* =========================================================
   2. ダイアログを開く・表を描く
   ========================================================= */

// 予定登録のダイアログを開く（予定表のセルを押したとき）
//   memberId … メンバーID、dateText … "YYYY-MM-DD"
function openEditor(memberId, dateText) {
  const member = findMember(memberId);
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const isOff = !isActive(member); // スタンバイ期間外（見た目は灰色だが編集はできる）

  draft = {
    mid: memberId,
    ds: dateText,
    m: member,
    rows: buildRows(member, getEntries(memberId, dateText), dateText),
    off: isOff,
  };

  const dateLabel = `${year}年${month}月${day}日 (${WEEKDAY_NAMES[date.getDay()]}) の勤務予定・実績`;
  const offLabel = isOff ? "（スタンバイ期間外）" : "";

  openLayer(`<div class="scrim"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="edTitle">
    <header>${avatar(member)}<div><h3 id="edTitle">${escapeHtml(member.name)}</h3><p class="num">${dateLabel}${offLabel}</p></div></header>
    <div class="body" id="edBody"></div>
    <footer><span class="grow"></span><button class="btn" data-close>キャンセル</button><button class="btn btn-primary" id="edSave">保存</button></footer>
  </div></div>`);

  drawEditor();
  getElement("#edSave").addEventListener("click", saveEditor);
}

// 表の1行の HTML を作る（i は行の番号。入力欄の id に使う：ed-c-0, ed-s-0 …）
function editorRowHtml(row, i) {
  const item = ITEMS[row.item];
  const name = escapeHtml(rowName(row));

  // 列1：チェック
  const checkCell = `<td class="ck"><input type="checkbox" id="ed-c-${i}" ${row.on ? "checked" : ""} aria-label="${name}を登録"></td>`;

  // 列2：項目（マーク＋項目名。自由記述は項目名を入力する欄）
  const mark = item.mark
    ? markHTML(item.mark)
    : `<span class="dot" style="background:${item.dot}"></span>`;
  let label;
  if (row.item === "other") {
    label = `<input class="input itin" id="ed-n-${i}" value="${escapeHtml(row.note)}" maxlength="10" placeholder="任意で入力" title="自由記述の項目名（10文字まで。例：研修）" aria-label="自由記述の項目名">`;
  } else {
    label = `<b>${name}</b>`;
  }
  // 出社の行だけ、下に所定時間を小さく出す
  let hint = "";
  if (row.item === "work") {
    const member = draft.m;
    hint = `<small class="hint">所定 ${displayTime(member.sched[0])}〜${displayTime(member.sched[1])}（${escapeHtml(member.sys)}）</small>`;
  }
  const itemCell = `<td class="it"><div class="itname">${mark}${label}</div>${hint}</td>`;

  // 列3：時間（開始〜終了）
  const timeInput = (idPrefix, value, what) =>
    `<input class="input num tin" type="text" inputmode="numeric" maxlength="5" placeholder="--:--" autocomplete="off" id="${idPrefix}${i}" value="${value}" aria-label="${name} ${what}">`;
  const timeCell = `<td class="tm"><div class="tpair">${timeInput("ed-s-", row.start, "開始")}<span>〜</span>${timeInput("ed-e-", row.end, "終了")}</div></td>`;

  // 列4：備考
  const memoCell = `<td class="memo"><input class="input memo-in" id="ed-m-${i}" value="${escapeHtml(row.memo || "")}" maxlength="100" placeholder="任意" aria-label="${name}の備考"></td>`;

  return `<tr class="${row.on ? "" : "off"}" id="ed-r-${i}">${checkCell}${itemCell}${timeCell}${memoCell}</tr>`;
}

// 予定登録の表を描き直し、入力欄に動きを付ける
function drawEditor() {
  const body = getElement("#edBody");

  const html = [];
  html.push(
    `<div class="itbl-wrap"><table class="itbl"><thead><tr><th>チェック</th><th>項目</th><th>時間</th><th>備考</th></tr></thead><tbody>`,
  );
  draft.rows.forEach((row, i) => {
    html.push(editorRowHtml(row, i));
  });
  html.push(
    `<tr class="addrow"><td></td><td colspan="3"><button class="addbtn" id="edAdd">${ICONS.plus}項目を追加</button></td></tr>`,
  );
  html.push(`</tbody></table></div><p class="error" id="edErr" role="alert" hidden></p>`);
  body.innerHTML = html.join("");

  // 各行の入力欄に動きを付ける
  draft.rows.forEach((row, i) => {
    attachRowEvents(row, i);
  });

  // 「項目を追加」：自由記述の行を1行足し（チェック済み）、項目名の欄にカーソルを移す
  getElement("#edAdd").addEventListener("click", () => {
    readRows(); // 入力中の値を消さないよう、先に読み込んでおく
    draft.rows.push({
      item: "other",
      note: "",
      memo: "",
      on: true,
      base: false,
      start: "",
      end: "",
    });
    drawEditor();
    const nameInput = document.getElementById("ed-n-" + (draft.rows.length - 1));
    if (nameInput) {
      nameInput.focus();
    }
  });

  // 期間外の人には、表の上に案内を出す
  if (draft.off) {
    body.insertAdjacentHTML(
      "afterbegin",
      `<p class="notice ro-note">スタンバイ期間外のメンバーです。予定は編集できます。平日の予定は必須ではありません。</p>`,
    );
  }
}

// 1行分の入力欄に動きを付ける
function attachRowEvents(row, i) {
  const checkbox = getElement("#ed-c-" + i);
  const tableRow = getElement("#ed-r-" + i);

  // チェックを入れる・外す
  checkbox.addEventListener("change", () => {
    tableRow.classList.toggle("off", !checkbox.checked); // 外した行は灰色に
    readRows();
    // 午前休・午後休なら、出社の時刻を半日に合わせる
    if (row.item === "am" || row.item === "pm") {
      leaveAdjust(row.item, checkbox.checked);
    }
  });

  // 開始・終了の時刻
  for (const idPrefix of ["#ed-s-", "#ed-e-"]) {
    const timeInput = getElement(idPrefix + i);

    // 欄に入ったとき：「09:00」を「0900」にして全体を選ぶ（数字4桁で打ち直せるように）
    timeInput.addEventListener("focus", () => {
      const digits = timeDigits(timeInput.value);
      if (digits !== timeInput.value) {
        timeInput.value = digits;
      }
      timeInput.select();
    });

    // 入力するたび：数字以外は消し、4桁までにする。何か入れたら、その行に自動でチェック
    timeInput.addEventListener("input", () => {
      const cleaned = timeDigits(timeInput.value);
      if (cleaned !== timeInput.value) {
        timeInput.value = cleaned;
      }
      if (cleaned && !checkbox.checked) {
        checkbox.checked = true;
        tableRow.classList.remove("off");
      }
      readRows();
    });

    // 欄を離れたとき：「900」「9」などを「09:00」の形に整える
    timeInput.addEventListener("blur", () => {
      const normalized = normTime(timeInput.value);
      if (normalized) {
        timeInput.value = normalized;
      }
      readRows();
    });
  }

  // 自由記述の項目名：何か入れたら、その行に自動でチェック
  const nameInput = document.getElementById("ed-n-" + i);
  if (nameInput) {
    nameInput.addEventListener("input", () => {
      if (nameInput.value.trim() && !checkbox.checked) {
        checkbox.checked = true;
        tableRow.classList.remove("off");
      }
    });
  }
}

// 午前休・午後休にチェックしたら、出社の時間を半日に合わせる（外したら所定に戻す）
//   午前休：出社の開始 09:00 → 13:00、午後休：出社の終了 18:00 → 12:00
//   （出社の時刻を自分で変えていたら、そのままにする）
function leaveAdjust(itemCode, isChecked) {
  const workIndex = draft.rows.findIndex((row) => row.item === "work");
  if (workIndex < 0) {
    return;
  }
  const workRow = draft.rows[workIndex];
  const [workStart, workEnd] = draft.m.sched;

  if (itemCode === "am") {
    const from = isChecked ? workStart : "13:00";
    const to = isChecked ? "13:00" : workStart;
    if (workRow.start === from) {
      workRow.start = to;
      getElement("#ed-s-" + workIndex).value = to;
    }
  }
  if (itemCode === "pm") {
    const from = isChecked ? workEnd : "12:00";
    const to = isChecked ? "12:00" : workEnd;
    if (workRow.end === from) {
      workRow.end = to;
      getElement("#ed-e-" + workIndex).value = to;
    }
  }
}

/* =========================================================
   3. 時刻の入力（24時間表記 HH:MM）
   ========================================================= */

// 時刻の欄に入力できる形にする：数字だけ・4桁まで（例："9:00" → "900"、"０９３０" → "0930"、"12345" → "1234"）
function timeDigits(text) {
  return cleanTime(String(text || ""))
    .replace(/:/g, "")
    .slice(0, 4);
}

// 全角数字を半角にし、数字と「:」だけを残す（例："９：００" → "9:00"）
function cleanTime(text) {
  const halfWidth = text.replace(/[０-９：]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0),
  );
  return halfWidth.replace(/[^0-9:]/g, "");
}

// 「9:00」「900」「0900」「9」などを「09:00」にそろえる。時刻として正しくなければ null
function normTime(text) {
  const value = cleanTime(String(text || "")).trim();
  let hour;
  let minute;
  let match;

  if ((match = value.match(/^(\d{1,2}):(\d{1,2})$/))) {
    // 「9:00」「09:5」
    hour = Number(match[1]);
    minute = Number(match[2]);
  } else if ((match = value.match(/^(\d{1,2})(\d{2})$/))) {
    // 「900」「0900」
    hour = Number(match[1]);
    minute = Number(match[2]);
  } else if ((match = value.match(/^(\d{1,2})$/))) {
    // 「9」
    hour = Number(match[1]);
    minute = 0;
  } else {
    return null;
  }

  if (hour < 24 && minute < 60) {
    return pad2(hour) + ":" + pad2(minute);
  }
  return null;
}

/* =========================================================
   4. 入力の読み込み・チェック・保存
   ========================================================= */

// 表の入力（チェック・時刻・項目名・備考）を draft.rows に読み込む
function readRows() {
  draft.rows.forEach((row, i) => {
    const checkbox = getElement("#ed-c-" + i);
    if (!checkbox) {
      return;
    }
    row.on = checkbox.checked;

    // 時刻は形を整えて入れる（整えられないときは入力のまま入れ、保存時にエラーにする）
    const start = getElement("#ed-s-" + i).value.trim();
    const end = getElement("#ed-e-" + i).value.trim();
    row.start = normTime(start) || start;
    row.end = normTime(end) || end;

    const nameInput = document.getElementById("ed-n-" + i);
    if (nameInput) {
      row.note = nameInput.value.trim();
    }
    const memoInput = document.getElementById("ed-m-" + i);
    if (memoInput) {
      row.memo = memoInput.value.trim();
    }
  });
}

// チェックを入れた行だけを、予定データ（newEntry）の形にして返す
function checkedEntries() {
  return draft.rows
    .filter((row) => row.on)
    .map((row) => newEntry(row.item, row.start, row.end, row.note, row.memo));
}

// 保存前のチェック。問題があればエラーの文を返す（問題がなければ ""）
function validate() {
  for (const row of draft.rows) {
    if (!row.on) {
      continue; // チェックしていない行は調べない
    }
    const name = rowName(row);
    if (row.item === "other" && !row.note) {
      return "チェックを入れた行の項目名を入力してください（例：研修）。";
    }
    if (!row.start || !row.end) {
      return `「${name}」の開始と終了の時刻を入力してください。`;
    }
    if (!normTime(row.start) || !normTime(row.end)) {
      return `「${name}」の時刻は 00:00〜23:59 の形で入力してください（例：09:00）。`;
    }
    if (toMinutes(row.end) <= toMinutes(row.start)) {
      return `「${name}」の終了時刻を開始時刻より後にしてください。`;
    }
  }
  return "";
}

// 「保存」ボタン
function saveEditor() {
  readRows();
  const errorArea = getElement("#edErr");

  // 1. 入力のチェック
  const message = validate();
  if (message !== "") {
    errorArea.textContent = message;
    errorArea.hidden = false;
    return;
  }

  // 2. スタンバイ期間中のメンバーは、平日（月〜金）に予定が1つ以上必要
  const entries = checkedEntries();
  if (isActive(draft.m) && !isWeekend(draft.ds) && entries.length === 0) {
    errorArea.textContent =
      "平日の予定を空にはできません。スタンバイ期間中のメンバーは、月〜金に予定を1つ以上入れてください（休む日は「有給」など）。";
    errorArea.hidden = false;
    return;
  }

  // 3. 開始時刻の順に並べて保存する
  entries.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  state.edits[draft.mid + "|" + draft.ds] = entries;

  // 予定を1件以上保存したら、「最後に予定を保存した日」を今日にする（自動削除の数え直しに使う）
  if (entries.length > 0) {
    state.lastAdded[draft.mid] = toDateText(TODAY);
  }

  persist();
  closeLayer();
  render();
  flashCell(draft.mid + "|" + draft.ds); // どこに保存したか分かるよう、そのマスに目印を付ける（ぎゅいん→ポン。no03_calendar.js）
  toast("勤務予定を保存しました");
}
