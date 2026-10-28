/* =========================================================
   No11 お知らせ・No12 ログイン時のお知らせ
   ========================================================= */
"use strict";

/* ---------- ログイン時の削除予定のお知らせ（ポップアップ） ---------- */
// 一度お知らせしたメンバーは、次のログインでは出さない（ログインした人ごとに記録）
//   S.notified = { ログインした人のID: { member_id: 削除予定日 } }
//   削除予定日が変わった（予定を追加した・期間外にし直した）ときは、もう一度お知らせする
function showLoginNotice(purged){
  const seen=S.notified[S.user]||(S.notified[S.user]={});
  const fresh=deleteSoon().filter(m=>seen[m.id]!==deleteDate(m));
  if(!fresh.length&&!purged.length)return;
  fresh.forEach(m=>{seen[m.id]=deleteDate(m);});persist();
  let h=`<div class="scrim"><div class="modal notice-modal" role="dialog" aria-modal="true" aria-labelledby="lnTitle">
    <header><div><h3 id="lnTitle">削除予定のお知らせ</h3></div></header>
    <div class="body">`;
  if(fresh.length){
    h+=`<div class="noti-sec">削除予定メンバー（${fresh.length}名）</div><ul class="noti-list">`;
    h+=fresh.map(m=>`<li class="noti-item"><span class="noti-dot"></span><span class="noti-txt"><b>${esc(m.name)} さん</b><small>${fmtD(deleteDate(m))} に削除されます</small></span></li>`).join("");
    h+=`</ul>`;
  }
  if(purged.length){
    h+=`<div class="noti-sec">削除されたメンバー（${purged.length}名）</div><ul class="noti-list">`;
    h+=purged.map(m=>`<li class="noti-item done"><span class="noti-dot done"></span><span class="noti-txt"><b>${esc(m.name)} さん</b><small>期間外となってから${DELETE_MONTHS}か月が経過したため、${fmtD(ymd(TODAY))} にメンバーから削除しました</small></span></li>`).join("");
    h+=`</ul>`;
  }
  h+=`<p class="calc-note"><span class="cn-line"><b>自動削除の対象：</b>スタンバイ期間外のまま${DELETE_MONTHS}か月が経過したメンバー</span><span class="cn-line">このお知らせはカレンダー画面の「お知らせ（<svg class="icon bell-in" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>）」からいつでも確認できます。</span></p></div>
    <footer><span class="grow"></span><button type="button" class="btn btn-primary" data-close>閉じる</button></footer></div></div>`;
  openLayer(h);
}

/* ---------- お知らせ（削除対象の通知一覧） ---------- */
// 削除まで NOTICE_DAYS 日（1週間）を切ったスタンバイ期間外のメンバー（削除が近い順）
function deleteSoon(){
  return MEMBERS.filter(m=>!isActive(m)&&daysLeft(m)!==null&&daysLeft(m)<=NOTICE_DAYS).sort((a,b)=>daysLeft(a)-daysLeft(b));
}
// お知らせ一覧で見た削除予定（ログインした人ごと） { ログインした人のID: { member_id: 削除予定日 } }
const unreadSoon=()=>{const read=S.notiRead[S.user]||{};return deleteSoon().filter(m=>read[m.id]!==deleteDate(m));};
function markNotiRead(){const read=S.notiRead[S.user]||(S.notiRead[S.user]={});deleteSoon().forEach(m=>{read[m.id]=deleteDate(m);});persist();updateNotiBadge();}
function updateNotiBadge(){
  const n=unreadSoon().length,bd=$("#notiBadge");if(!bd)return;
  bd.textContent=n;bd.hidden=!n;
  $("#notiBtn").setAttribute("aria-label",n?`お知らせ ${n}件`:"お知らせ");
}
function openNoti(){
  // 削除済みは、この1か月に削除した分だけ出す
  const since=ymd(new Date(TODAY.getFullYear(),TODAY.getMonth()-LOG_MONTHS,TODAY.getDate()));
  const soon=deleteSoon(),log=S.deletedLog.filter(x=>x.date>=since);
  let h=`<div class="pop noti-pop" role="dialog" aria-label="お知らせ" id="notiPop"><h4>お知らせ<small>削除の${NOTICE_DAYS}日前からお知らせします</small></h4>`;
  h+=`<div class="noti-sec">削除予定のメンバー（${soon.length}名）</div><ul class="noti-list">`;
  h+=soon.length?soon.map(m=>`<li class="noti-item"><span class="noti-dot"></span><span class="noti-txt"><b>${esc(m.name)} さん</b><small>${fmtD(deleteDate(m))} に削除されます。続ける場合は予定を追加するか、スタンバイ期間中に戻してください。</small></span></li>`).join("")
    :`<li class="noti-empty">削除予定のメンバーはいません。</li>`;
  h+=`</ul><div class="noti-sec">削除済みのメンバー（この1か月・${log.length}名）</div><ul class="noti-list">`;
  h+=log.length?log.map(x=>`<li class="noti-item done"><span class="noti-dot done"></span><span class="noti-txt"><b>${esc(x.name)} さん</b><small>${fmtD(x.date)} にメンバーから${x.manual?"手動で":""}削除しました。</small></span></li>`).join("")
    :`<li class="noti-empty">この1か月に削除されたメンバーはいません。</li>`;
  h+=`</ul></div>`;
  openLayer(h);placePop($("#notiPop"),$("#notiBtn"));
}
$("#notiBtn").addEventListener("click",e=>{e.stopPropagation();if(document.getElementById("notiPop")){closeLayer();return;}openNoti();});
