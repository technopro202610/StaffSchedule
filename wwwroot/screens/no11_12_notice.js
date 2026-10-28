/* =========================================================
   No11 お知らせ・No12 ログイン時のお知らせ
     No12 ログインしたときのポップアップ：
          ・削除予定のメンバー（削除日の7日前から）※一度お知らせした人は次のログインでは出さない
          ・今回のログインで自動削除したメンバー
     No11 ヘッダーの「お知らせ」（ベルのボタン）：
          ・削除予定のメンバー
          ・削除済みのメンバー（この1か月）
          ・ボタンの数字＝まだ見ていない削除予定の人数
   ========================================================= */
"use strict";

// ベルのアイコン（ログイン時のお知らせの説明文の中で使う）
const BELL_ICON =
  '<svg class="icon bell-in" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';

/* =========================================================
   1. 削除予定のメンバー
   ========================================================= */

// 削除まで NOTICE_DAYS 日（7日）を切ったスタンバイ期間外のメンバー（削除が近い順）
function deleteSoon() {
  const soonMembers = MEMBERS.filter((member) => {
    if (isActive(member)) return false;
    const days = daysLeft(member);
    return days !== null && days <= NOTICE_DAYS;
  });
  soonMembers.sort((a, b) => daysLeft(a) - daysLeft(b));
  return soonMembers;
}

// お知らせ一覧で、まだ見ていない削除予定のメンバー
//   見た記録：state.notiRead = { ログインした人のID: { メンバーID: 見たときの削除日 } }
//   削除日が変わった人（予定を保存した・期間外にし直した）は、もう一度「未読」にする
function unreadSoon() {
  const readRecord = state.notiRead[state.user] || {};
  return deleteSoon().filter((member) => readRecord[member.id] !== deleteDate(member));
}

// 削除予定のメンバーを「見た」ことにする（お知らせ一覧を閉じたときに呼ぶ）→ 数字が消える
function markNotiRead() {
  if (!state.notiRead[state.user]) {
    state.notiRead[state.user] = {};
  }
  const readRecord = state.notiRead[state.user];
  deleteSoon().forEach((member) => {
    readRecord[member.id] = deleteDate(member);
  });
  persist();
  updateNotiBadge();
}

// ヘッダーのお知らせボタンの数字（まだ見ていない削除予定の人数）を更新する
function updateNotiBadge() {
  const badge = getElement("#notiBadge");
  if (!badge) {
    return;
  }
  const count = unreadSoon().length;
  badge.textContent = count;
  badge.hidden = count === 0;
  getElement("#notiBtn").setAttribute("aria-label", count > 0 ? `お知らせ ${count}件` : "お知らせ");
}

/* =========================================================
   2. No12 ログイン時のお知らせ（ポップアップ）
   ========================================================= */

// ログインしたときに呼ぶ（no01_login.js の enterApp）
//   purgedMembers … 今回のログインで自動削除したメンバー
// 一度お知らせした削除予定の人は、次のログインでは出さない（ログインした人ごとに記録）
//   記録：state.notified = { ログインした人のID: { メンバーID: お知らせしたときの削除日 } }
//   削除日が変わったときは、もう一度お知らせする
function showLoginNotice(purgedMembers) {
  if (!state.notified[state.user]) {
    state.notified[state.user] = {};
  }
  const notifiedRecord = state.notified[state.user];

  // まだお知らせしていない削除予定の人
  const newSoonMembers = deleteSoon().filter(
    (member) => notifiedRecord[member.id] !== deleteDate(member),
  );

  // お知らせすることがなければ、何も出さない
  if (newSoonMembers.length === 0 && purgedMembers.length === 0) {
    return;
  }

  // 今回お知らせした人を記録する
  newSoonMembers.forEach((member) => {
    notifiedRecord[member.id] = deleteDate(member);
  });
  persist();

  const html = [];
  html.push(`<div class="scrim"><div class="modal notice-modal" role="dialog" aria-modal="true" aria-labelledby="lnTitle">
    <header><div><h3 id="lnTitle">削除予定のお知らせ</h3></div></header>
    <div class="body">`);

  // 削除予定のメンバー
  if (newSoonMembers.length > 0) {
    html.push(
      `<div class="noti-sec">削除予定メンバー（${newSoonMembers.length}名）</div><ul class="noti-list">`,
    );
    newSoonMembers.forEach((member) => {
      html.push(
        `<li class="noti-item"><span class="noti-dot"></span><span class="noti-txt"><b>${escapeHtml(member.name)} さん</b><small>${toSlashDate(deleteDate(member))} に削除されます</small></span></li>`,
      );
    });
    html.push(`</ul>`);
  }

  // 今回自動削除したメンバー
  if (purgedMembers.length > 0) {
    const todayText = toSlashDate(toDateText(TODAY));
    html.push(
      `<div class="noti-sec">削除されたメンバー（${purgedMembers.length}名）</div><ul class="noti-list">`,
    );
    purgedMembers.forEach((member) => {
      html.push(
        `<li class="noti-item done"><span class="noti-dot done"></span><span class="noti-txt"><b>${escapeHtml(member.name)} さん</b><small>期間外となってから${DELETE_MONTHS}か月が経過したため、${todayText} にメンバーから削除しました</small></span></li>`,
      );
    });
    html.push(`</ul>`);
  }

  // 下の説明（自動削除の対象・お知らせの見方）
  html.push(`<p class="calc-note"><span class="cn-line"><b>自動削除の対象：</b>スタンバイ期間外のまま${DELETE_MONTHS}か月が経過したメンバー</span><span class="cn-line">このお知らせはカレンダー画面の「お知らせ（${BELL_ICON}）」からいつでも確認できます。</span></p></div>
    <footer><span class="grow"></span><button type="button" class="btn btn-primary" data-close>閉じる</button></footer></div></div>`);

  openLayer(html.join(""));
}

/* =========================================================
   3. No11 お知らせ一覧（ヘッダーのベルのボタン）
   ========================================================= */

// お知らせ一覧（削除予定・削除済み）をポップアップで開く
function openNoti() {
  // 削除済みは、この1か月（LOG_MONTHS）に削除した分だけ出す
  const fromDate = new Date(TODAY.getFullYear(), TODAY.getMonth() - LOG_MONTHS, TODAY.getDate());
  const fromText = toDateText(fromDate);
  const soonMembers = deleteSoon();
  const deletedLogs = state.deletedLog.filter((log) => log.date >= fromText);

  const html = [];
  html.push(
    `<div class="pop noti-pop" role="dialog" aria-label="お知らせ" id="notiPop"><h4>お知らせ<small>削除の${NOTICE_DAYS}日前からお知らせします</small></h4>`,
  );

  // 削除予定のメンバー
  html.push(
    `<div class="noti-sec">削除予定のメンバー（${soonMembers.length}名）</div><ul class="noti-list">`,
  );
  if (soonMembers.length > 0) {
    soonMembers.forEach((member) => {
      html.push(
        `<li class="noti-item"><span class="noti-dot"></span><span class="noti-txt"><b>${escapeHtml(member.name)} さん</b><small>${toSlashDate(deleteDate(member))} に削除されます。続ける場合は予定を追加するか、スタンバイ期間中に戻してください。</small></span></li>`,
      );
    });
  } else {
    html.push(`<li class="noti-empty">削除予定のメンバーはいません。</li>`);
  }

  // 削除済みのメンバー（手動で削除した人は「手動で」と出す）
  html.push(
    `</ul><div class="noti-sec">削除済みのメンバー（この1か月・${deletedLogs.length}名）</div><ul class="noti-list">`,
  );
  if (deletedLogs.length > 0) {
    deletedLogs.forEach((log) => {
      const how = log.manual ? "手動で" : "";
      html.push(
        `<li class="noti-item done"><span class="noti-dot done"></span><span class="noti-txt"><b>${escapeHtml(log.name)} さん</b><small>${toSlashDate(log.date)} にメンバーから${how}削除しました。</small></span></li>`,
      );
    });
  } else {
    html.push(`<li class="noti-empty">この1か月に削除されたメンバーはいません。</li>`);
  }
  html.push(`</ul></div>`);

  openLayer(html.join(""));
  placePop(getElement("#notiPop"), getElement("#notiBtn"));
}

// ヘッダーのお知らせボタン：お知らせ一覧を開く（開いていれば閉じる）
getElement("#notiBtn").addEventListener("click", (event) => {
  event.stopPropagation(); // 画面全体のクリック（閉じる処理）に伝えない
  if (document.getElementById("notiPop")) {
    closeLayer();
    return;
  }
  openNoti();
});
