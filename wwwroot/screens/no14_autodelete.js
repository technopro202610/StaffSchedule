/* =========================================================
   No14 自動削除
   スタンバイ期間外のまま6か月たったメンバーを、ログインしたときに自動で削除する。
     削除日 ＝「期間外になった日」と「最後に予定を保存した日」の遅い方 ＋ 6か月（DELETE_MONTHS）
     ・スタンバイ期間中に戻すと、数えるのをやめる
     ・もう一度期間外にすると、その日から6か月を数え直す
   削除日の7日前から、お知らせ（No11・No12）に出す。
   ========================================================= */
"use strict";

// 削除の何日前から、お知らせ（一覧・ログイン時のポップアップ）に出すか（1週間前）
const NOTICE_DAYS = 7;

// お知らせの「削除済みのメンバー」に、何か月前の分まで出すか（1か月）
const LOG_MONTHS = 1;

// "YYYY-MM-DD" を "YYYY/MM/DD" にする（画面に出すとき用）
function toSlashDate(dateText) {
  return dateText.replace(/-/g, "/");
}

// メンバーの削除日を "YYYY-MM-DD" で返す（スタンバイ期間中なら null）
function deleteDate(member) {
  const inactiveInfo = state.inactive[member.id];
  if (!inactiveInfo) {
    return null; // スタンバイ期間中
  }

  // 「期間外になった日」と「最後に予定を保存した日」の遅い方
  //   "YYYY-MM-DD" の文字は、そのまま並べ替えると日付の順になる
  const lastSaved = state.lastAdded[member.id] || "";
  const baseDate = [inactiveInfo.since, lastSaved].sort().pop();

  // その日の6か月後
  const [year, month, day] = baseDate.split("-").map(Number);
  return toDateText(new Date(year, month - 1 + DELETE_MONTHS, day));
}

// 削除日まで、あと何日か（スタンバイ期間中なら null。削除日を過ぎていればマイナス）
function daysLeft(member) {
  const deleteDateText = deleteDate(member);
  if (!deleteDateText) {
    return null;
  }
  const [year, month, day] = deleteDateText.split("-").map(Number);
  const oneDay = 24 * 60 * 60 * 1000; // 1日のミリ秒
  return Math.round((new Date(year, month - 1, day) - TODAY) / oneDay);
}

// メンバー一覧に出す「期間外」のバッジ
function offBadge(member) {
  return `<span class="badge-off">期間外</span>`;
}

// メンバーを削除する（そのメンバーの予定・状態もすべて消し、削除の記録を残す）
//   isManual … 削除ボタンで手動で削除したときは true、自動削除は false
function removeMember(member, isManual) {
  // メンバーの一覧から外す
  MEMBERS.splice(MEMBERS.indexOf(member), 1);
  state.members = state.members.filter((added) => added.id !== member.id);

  // そのメンバーの予定を消す（キーは "メンバーID|日付"）
  for (const key of Object.keys(state.edits)) {
    if (key.startsWith(member.id + "|")) {
      delete state.edits[key];
    }
  }

  // そのメンバーの状態を消す
  delete state.inactive[member.id];
  delete state.lastAdded[member.id];
  delete state.colors[member.id];
  delete state.pick[member.id];
  delete state.sel[member.id];

  // 削除したことを記録する（お知らせの「削除済み」に出る）
  if (!state.deleted.includes(member.id)) {
    state.deleted.push(member.id);
  }
  state.deletedLog.unshift({ name: member.name, date: toDateText(TODAY), manual: !!isManual });
}

// 削除日を過ぎたスタンバイ期間外のメンバーを、自動で削除する（ログインしたときに呼ぶ）
// 削除したメンバーの配列を返す（No12 ログイン時のお知らせに出す）
function purgeExpired() {
  const expiredMembers = MEMBERS.filter((member) => !isActive(member) && daysLeft(member) <= 0);

  for (const member of expiredMembers) {
    removeMember(member, false);
  }
  if (expiredMembers.length > 0) {
    persist();
  }
  return expiredMembers;
}
