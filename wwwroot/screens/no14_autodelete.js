/* =========================================================
   No14 自動削除
   削除日の計算と、ログイン時の自動削除（purgeExpired）。
   ========================================================= */
"use strict";

/* ---------- スタンバイ期間外メンバーの自動削除 ----------
   期間外になった日と、最後に予定を追加した日の遅い方から6か月たつと削除する。
   期間中に戻すと数えるのをやめ、もう一度期間外にした日から改めて6か月を数える。 */
const fmtD=ds=>ds.replace(/-/g,"/");
function deleteDate(m){
  const inv=S.inactive[m.id];if(!inv)return null;
  const base=[inv.since,S.lastAdded[m.id]||""].sort().pop();
  const[y,mo,d]=base.split("-").map(Number);return ymd(new Date(y,mo-1+DELETE_MONTHS,d));
}
function daysLeft(m){const dd=deleteDate(m);if(!dd)return null;const[y,mo,d]=dd.split("-").map(Number);return Math.round((new Date(y,mo-1,d)-TODAY)/864e5);}
const NOTICE_DAYS=7; // 削除の何日前から、お知らせ（一覧・ログイン時のポップアップ）に出すか（1週間前）
const LOG_MONTHS=1;  // お知らせの「削除済みのメンバー」に何か月前の分まで出すか（1か月）
function offBadge(m){
  return `<span class="badge-off">期間外</span>`;}
// メンバーを削除する（予定・状態の記録も消す）。manual=true は削除ボタンで手動削除したとき
function removeMember(m,manual){
  MEMBERS.splice(MEMBERS.indexOf(m),1);
  S.members=S.members.filter(x=>x.id!==m.id);
  for(const k of Object.keys(S.edits))if(k.startsWith(m.id+"|"))delete S.edits[k];
  delete S.inactive[m.id];delete S.lastAdded[m.id];delete S.colors[m.id];delete S.pick[m.id];delete S.sel[m.id];
  if(!S.deleted.includes(m.id))S.deleted.push(m.id);
  S.deletedLog.unshift({name:m.name,date:ymd(TODAY),manual:!!manual});
}

function purgeExpired(){
  const gone=MEMBERS.filter(m=>!isActive(m)&&daysLeft(m)<=0);
  for(const m of gone)removeMember(m,false);
  if(gone.length)persist();
  return gone;
}
