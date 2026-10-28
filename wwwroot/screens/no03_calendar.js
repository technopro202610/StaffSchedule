/* =========================================================
   No3 カレンダー画面
   予定表・メンバー一覧の描画（render）、週の移動、画面全体のクリックの振り分け。
   ========================================================= */
"use strict";

/* ---------- Render ---------- */
function visibleDays(){const d=[];for(let i=0;i<7;i++)d.push(addDays(S.week,i));return d;} // 月〜日の7日間
function filtered(){const q=toKata(S.q.trim().replace(/\s/g,""));if(!q)return MEMBERS;return MEMBERS.filter(m=>(m.name+m.kana).replace(/\s/g,"").includes(q));}
// ヘッダーの高さ（画面幅で折り返すと変わる）を CSS に渡す
function fitBoard(){const t=document.querySelector(".topbar");if(t)document.documentElement.style.setProperty("--top-h",t.offsetHeight+"px");}
window.addEventListener("resize",fitBoard);
// メンバー一覧の表示・非表示（ヘッダー左のボタン）
function applySide(){const open=S.set.sideOpen!==false,btn=$("#sideBtn");
  document.querySelector(".main").classList.toggle("side-closed",!open);
  btn.setAttribute("aria-expanded",String(open));
  const t=open?"メンバー一覧を隠す":"メンバー一覧を表示";btn.setAttribute("aria-label",t);btn.title=t;}
$("#sideBtn").addEventListener("click",()=>{S.set.sideOpen=S.set.sideOpen===false;persist();render();});
// カレンダーで見られる期間：今日の1年前の週 〜 1年後の週
function weekMin(){const d=new Date(TODAY);d.setFullYear(d.getFullYear()-1);return mondayOf(d);}
function weekMax(){const d=new Date(TODAY);d.setFullYear(d.getFullYear()+1);return mondayOf(d);}
function dayMin(){const d=new Date(TODAY);d.setFullYear(d.getFullYear()-1);return ymd(d);}
function dayMax(){const d=new Date(TODAY);d.setFullYear(d.getFullYear()+1);return ymd(d);}
function clampWeek(){if(S.week<weekMin())S.week=weekMin();if(S.week>weekMax())S.week=weekMax();}
function render(){
  clampWeek();
  $("#prevBtn").disabled=ymd(S.week)<=ymd(weekMin());$("#nextBtn").disabled=ymd(S.week)>=ymd(weekMax());
  fitBoard();applySide();updateNotiBadge();
  const e=addDays(S.week,6);
  $("#periodLabel").textContent=`${S.week.getFullYear()}年${S.week.getMonth()+1}月${S.week.getDate()}日 (${WD[S.week.getDay()]}) 〜 ${e.getMonth()+1}月${e.getDate()}日 (${WD[e.getDay()]})`;
  renderList();renderWeek();
}
// スタンバイ対象（活性）かどうか。非活性の人は週表示・日表示に出さない
const isActive=m=>!S.inactive[m.id];
// メンバー一覧でチェックが入っている人だけをスケジュールに出す
// （まだチェックを触っていない人は、スタンバイ期間中ならチェックあり・期間外ならチェックなし）
// スタンバイ期間中のメンバーはいつもカレンダーに出す。期間外のメンバーは「カレンダーに表示」で選んだ人だけ出す
const onCal=m=>isActive(m)||!!S.pick[m.id];
// フリガナの頭文字から「ア行」「カ行」…を決める（濁音は清音の行に入る）
const GYOU_NAMES=["ア行","カ行","サ行","タ行","ナ行","ハ行","マ行","ヤ行","ラ行","ワ行"];
function gyouOf(m){const c=sortKey(m)[0];const i=GYOU.findIndex(([chars])=>chars.includes(c));return i<0?"その他":GYOU_NAMES[i];}
const newGroup=(arr,i)=>i===0||gyouOf(arr[i-1])!==gyouOf(arr[i]);
function listGrouped(arr,on){
  return arr.map((m,i)=>{let h="";
    if(newGroup(arr,i))h=`<li class="grp-sep"><span>${gyouOf(m)}</span></li>`;
    return h+mItem(m,on);}).join("");
}
function mItem(m,on){
  // カレンダーに出ていない期間中の人には「非表示」、カレンダーに出している期間外の人には「表示中」を付ける
  const right=on?"":(onCal(m)?`<span class="badge-show">表示中</span>`:"")+offBadge(m);
  const chk=`<label class="mchk"><input type="checkbox" data-pick="${m.id}"${selOf(m)?" checked":""} aria-label="${esc(m.name)} を選択"></label>`;
  return `<li class="mrow${on?"":" off"}">${chk}<button class="mitem${m.id===S.user?" me":""}${on?"":" inactive"}" data-member="${m.id}" title="${esc(m.name)}${m.kana?"（"+esc(toHira(m.kana))+"）":""}"><span class="mname"><b>${esc(m.name)}</b>${m.kana?`<small>${esc(toHira(m.kana))}</small>`:""}</span>${right}${I.chev}</button></li>`;}
function renderList(){
  const list=filtered(),act=list.filter(isActive),ina=list.filter(m=>!isActive(m));
  const ul=$("#memberList");
  // 該当者が0人でも「スタンバイ期間中」「スタンバイ期間外」の見出し（バー）はいつも表示する
  const none=what=>S.q.trim()?`<li class="empty-list">「${esc(S.q)}」に一致する${what}のメンバーはいません。</li>`:`<li class="empty-list">${what}のメンバーはいません。</li>`;
  const aOpen=S.set.activeOpen;
  let h=`<li class="list-sep sep-act"><label class="sep-chk"><input type="checkbox" data-pick-all="act" aria-label="スタンバイ期間中のメンバーをまとめて選択">スタンバイ期間中 ${act.length}名</label><button class="link sep-btn" id="activeToggle" aria-expanded="${aOpen}">${aOpen?"とじる":"ひらく"}</button><span class="sep-actions"><button class="mini-btn" data-stby-to="act">スタンバイ期間外</button></span></li>`;
  if(aOpen)h+=act.length?listGrouped(act,true):none("スタンバイ期間中");
  {const open=S.set.inactiveOpen;
    h+=`<li class="list-sep sep-ina"><label class="sep-chk"><input type="checkbox" data-pick-all="ina" aria-label="スタンバイ期間外のメンバーをまとめて選択">スタンバイ期間外</label><button class="link sep-btn" id="inactiveToggle" aria-expanded="${open}">${open?"とじる":"ひらく"}</button><span class="sep-actions"><button class="mini-btn" data-apply="ina">カレンダーに表示</button><button class="mini-btn" data-stby-to="ina">スタンバイ期間中</button></span></li>`;
    if(open)h+=ina.length?listGrouped(ina,false):none("スタンバイ期間外");}
  ul.innerHTML=h;
  // 見出しのチェック：全員チェック＝☑、一部だけ＝－（途中）、だれもいない＝□
  [["act",act],["ina",ina]].forEach(([k,arr])=>{const box=ul.querySelector(`[data-pick-all="${k}"]`);if(!box)return;
    const n=arr.filter(selOf).length;box.checked=arr.length>0&&n===arr.length;box.indeterminate=n>0&&n<arr.length;box.disabled=!arr.length;
    ul.querySelectorAll(`[data-apply="${k}"],[data-stby-to="${k}"]`).forEach(b=>{b.disabled=!arr.length;});
    // ☑を変えてまだ「カレンダーに表示」を押していないときは、ボタンを目立たせる
    const ap=ul.querySelector(`[data-apply="${k}"]`);if(ap)ap.classList.toggle("pending",arr.some(selOf));});
}
function chipHTML(e,m,list){const t=disp(e,m,list);
  // 備考があれば💬マークを付け、マウスを乗せると備考の全文をふきだしで出す（data-memo）
  return `<span class="chip ${t.cls}${e.memo?" has-memo":""}"${e.memo?` data-memo="${esc(e.memo)}"`:""}><span class="lbl">${t.mark?markHTML(t.mark):I[t.icon]}${esc(t.label)}</span><span class="tm">${showT(e.start)} - ${showT(e.end)}</span>${e.memo?`<span class="memo-ic" aria-label="備考あり">${I.memo}</span>`:""}${I.caret}</span>`;}
// 「+n件」：ボタンの下に、その日の予定をすべてプルダウンで出す（予定を押すと予定登録が開く）
// 予定表の名前：6文字＋全角空白1文字（7文字）まで表示。超える分は隠し、マウスを乗せると全部出す
const NAME_MAX=7;
function nameCell(name){
  const z=[...String(name).replace(/ /g,"　")]; // 姓と名の間は全角空白にそろえる
  if(z.length<=NAME_MAX)return `<span class="mname7">${esc(z.join(""))}</span>`;
  return `<span class="mname7 cut" tabindex="0" data-full="${esc(z.join(""))}" aria-label="${esc(z.join(""))}">${esc(z.slice(0,NAME_MAX).join(""))}</span>`;
}
// 備考のふきだし：💬のある予定にマウスを乗せると出す
const memoTip=document.createElement("div");memoTip.className="memo-tip";memoTip.hidden=true;document.body.appendChild(memoTip);
function showTip(e){const c=e.target.closest&&e.target.closest(".chip.has-memo,.mname7.cut");
  if(!c){memoTip.hidden=true;return;}
  memoTip.innerHTML=c.dataset.full?esc(c.dataset.full):`<b>備考</b>${esc(c.dataset.memo)}`;memoTip.hidden=false;
  const r=c.getBoundingClientRect(),w=memoTip.offsetWidth,h=memoTip.offsetHeight;
  memoTip.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+"px";
  memoTip.style.top=(r.bottom+6+h>innerHeight?r.top-h-6:r.bottom+6)+"px";}
document.addEventListener("mouseover",showTip);document.addEventListener("focusin",showTip);
document.addEventListener("scroll",()=>{memoTip.hidden=true;},true);
function openMorePop(btn){
  const key=btn.dataset.more,[mid,ds]=key.split("|"),m=byId(mid),en=getEntries(mid,ds),[y,mo,d]=ds.split("-").map(Number),dt=new Date(y,mo-1,d);
  openLayer(`<div class="pop more-pop" role="dialog" aria-label="${esc(m.name)}さんの予定" id="morePop" data-key="${key}"><h4>${mo}/${d}（${WD[dt.getDay()]}）${esc(m.name)}　${en.length}件</h4>
    <button class="cellbtn" data-edit="${mid}|${ds}" aria-label="${esc(m.name)} ${mo}月${d}日の予定を編集">${en.map(e=>chipHTML(e,m,en)).join("")}</button></div>`);
  placeMorePop();
}
// プルダウンを「全件表示」ボタンの真下に置く。表をスクロールしてもボタンにくっついて動く
function placeMorePop(){
  const pop=document.getElementById("morePop");if(!pop)return;
  const btn=document.querySelector(`[data-more="${pop.dataset.key}"]`);if(!btn){closeLayer();return;}
  const r=btn.getBoundingClientRect(),box=$("#boardBody").getBoundingClientRect(),head=$("#boardBody thead th"),top=head?head.getBoundingClientRect().bottom:box.top;
  // ボタンが表の見える範囲から外れたら、プルダウンも隠す
  pop.style.visibility=r.bottom<top||r.top>box.bottom||r.right<box.left||r.left>box.right?"hidden":"visible";
  const w=pop.offsetWidth;
  pop.style.left=Math.max(16,Math.min(r.left+window.scrollX,window.scrollX+document.documentElement.clientWidth-w-16))+"px";
  pop.style.top=(r.bottom+window.scrollY+4)+"px";
}
$("#boardBody").addEventListener("scroll",placeMorePop);
window.addEventListener("scroll",placeMorePop);
window.addEventListener("resize",placeMorePop);
function renderWeek(){
  // 並び順：スタンバイ期間中（50音順）→ その下に期間外（50音順）
  const days=visibleDays(),shown=filtered().filter(onCal),act=shown.filter(isActive),ina=shown.filter(m=>!isActive(m)),list=[...act,...ina];
  let h=`<table class="grid"><thead><tr><th class="mcol">メンバー</th>`;
  days.forEach(d=>{const hol=holidayName(d),c=d.getDay()===0||hol?"sun":d.getDay()===6?"sat":""; // 日曜・祝日は赤、土曜は青
    h+=`<th class="${c}${sameDay(d,TODAY)?" is-today":""}"${hol?` title="${hol}"`:""}><span class="d">${d.getMonth()+1}/${d.getDate()}</span><span class="w">${WD[d.getDay()]}</span></th>`;});
  h+=`</tr></thead><tbody>`;
  if(!list.length)h+=`<tr class="no-rows"><td colspan="${days.length+1}">該当するメンバーがいません。</td></tr>`;
  list.forEach((m,i)=>{
    if(i===act.length&&i>0)h+=`<tr class="grp grp-off"><th colspan="${days.length+1}" scope="colgroup"><span>スタンバイ期間外</span></th></tr>`;
    if(i===act.length||newGroup(list,i))h+=`<tr class="grp"><th colspan="${days.length+1}" scope="colgroup"><span>${gyouOf(m)}</span></th></tr>`;
    const off=!isActive(m),dis=off?' title="スタンバイ期間外（予定は編集できます）"':"";
    h+=`<tr${off?' class="row-off"':""}><td class="mcell"><div class="mcell-in${isActive(m)?"":" off"}">${nameCell(m.name)}${isActive(m)?"":`<span class="badge-off">期間外</span>`}</div></td>`;
    days.forEach(d=>{const ds=ymd(d),en=getEntries(m.id,ds),wk=d.getDay()===0||d.getDay()===6;
      const cls=["dcell"];if(wk)cls.push("wkend");if(sameDay(d,TODAY))cls.push("today-col");
      const miss=!en.length&&!wk&&isActive(m); // スタンバイ期間中なのに平日の予定がない
      if(miss)cls.push("missing-cell");
      const key=m.id+"|"+ds;
      const inner=en.length?chipHTML(en[0],m,en):miss?`<span class="missing">未入力</span>`:`<span class="dash">-</span>`;
      const aria=`${m.name} ${d.getMonth()+1}月${d.getDate()}日の予定を編集`;
      // 予定が複数件の日は、予定のかわりに「全件表示」ボタンだけを出す（押すとプルダウンで全件）
      h+=en.length>1
        ?`<td class="${cls.join(" ")}"><button class="more-btn" data-more="${key}" aria-haspopup="dialog" aria-label="${esc(m.name)} ${d.getMonth()+1}月${d.getDate()}日の予定 ${en.length}件をすべて表示"><span class="more-n">予定 ${en.length}件</span><span class="more-sub">全件表示${I.caret}</span></button></td>`
        :`<td class="${cls.join(" ")}"><button class="cellbtn" data-edit="${m.id}|${ds}" aria-label="${aria}"${dis}>${inner}</button></td>`;});
    h+=`</tr>`;});
  h+=`</tbody></table>`;$("#boardBody").innerHTML=h;
}

/* ---------- Navigation ---------- */
function shift(n){S.week=addDays(S.week,7*n);clampWeek();render();}
$("#prevBtn").addEventListener("click",()=>shift(-1));
$("#nextBtn").addEventListener("click",()=>shift(1));
$("#todayBtn").addEventListener("click",()=>{S.week=mondayOf(TODAY);render();});
$("#searchInput").addEventListener("input",e=>{S.q=e.target.value;render();});


document.addEventListener("click",e=>{
  const t=e.target;
  // プルダウン（全件表示・日付選択）が開いているときに外側をクリックしたら、閉じるだけにする
  //   （ほかのセルの予定登録などは開かない）。同じ「全件表示」ボタンをもう一度押しても閉じる
  const openPop=layer.firstElementChild&&layer.firstElementChild.classList.contains("pop")?layer.firstElementChild:null;
  if(openPop&&!t.closest(".pop")){
    const mo=t.closest("[data-more]"),same=mo&&openPop.dataset.key===mo.dataset.more;
    closeLayer();if(mo&&!same)openMorePop(mo); // 別の「全件表示」ボタンなら、そちらを開く
    return;
  }
  const cal=t.closest("[data-cal]:not([disabled])");if(cal){S.calYear+=Number(cal.dataset.cal);$("#calPop").innerHTML=calHTML();return;}
  const dd=t.closest("[data-date]");if(dd){const[y,m,d]=dd.dataset.date.split("-").map(Number);S.week=mondayOf(new Date(y,m-1,d));closeLayer();render();return;}
  if(t.closest("#activeToggle")){S.set.activeOpen=!S.set.activeOpen;persist();renderList();return;}
  if(t.closest("#inactiveToggle")){S.set.inactiveOpen=!S.set.inactiveOpen;persist();renderList();return;}
  if(t.closest("#addMemberBtn")){openMemberForm();return;}
  if(t.closest("#delMemberBtn")){askDelete();return;}
  const ap=t.closest("[data-apply]");if(ap){applyCal(ap.dataset.apply);return;}
  const st=t.closest("[data-stby-to]");if(st){askStandby(st.dataset.stbyTo);return;}
  const mo=t.closest("[data-more]");if(mo){e.stopPropagation();openMorePop(mo);return;}
  const ed=t.closest("[data-edit]");if(ed){const[mid,ds]=ed.dataset.edit.split("|");openEditor(mid,ds);return;}
  const mb=t.closest("[data-member]");if(mb){openMemberForm(mb.dataset.member);return;}
  if(t.id==="resetData"){S.edits={};for(const a of S.members){const i=MEMBERS.findIndex(x=>x.id===a.id);if(i>=0)MEMBERS.splice(i,1);}S.members=[];S.colors={};S.inactive=demoInactive();S.lastAdded={};
    for(const id of S.deleted){const b=BUILTIN.find(x=>x.id===id&&!x.addedMember);if(b&&!MEMBERS.includes(b))MEMBERS.push(b);}S.deleted=[];S.deletedLog=demoDeletedLog();S.notified={};S.notiRead={};sortMembers();S.pick={};S.sel={};persist();closeLayer();render();toast("ダミーデータを初期状態に戻しました");return;}
  if(t.closest("[data-close]")||t.classList.contains("scrim")){closeLayer();return;}
  if(layer.firstElementChild&&layer.firstElementChild.classList.contains("pop")&&!t.closest(".pop"))closeLayer();
});
document.addEventListener("change",e=>{
  const id=e.target.id;
  const pk=e.target.dataset.pick;if(pk){S.sel[pk]=e.target.checked;renderList();return;} // 選ぶだけ（反映はボタンで）
  const pa=e.target.dataset.pickAll;if(pa){sectionMembers(pa).forEach(m=>{S.sel[m.id]=e.target.checked;});renderList();return;}
});
