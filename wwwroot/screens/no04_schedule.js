/* =========================================================
   No4 予定登録画面
   ========================================================= */
"use strict";

/* ---------- 項目追加・削除（勤務予定・実績の登録画面） ---------- */
let draft=null;
const isWk=ds=>{const[y,m,d]=ds.split("-").map(Number);const w=new Date(y,m-1,d).getDay();return w===0||w===6;};
// 初期時間：出社・有給は所定時間、午前休は所定の始まり〜12:00、午後休は13:00〜所定の終わり
function defTime(k,m){
  if(k==="work"||k==="home"||k==="paid")return [m.sched[0],m.sched[1]];
  if(k==="am")return [m.sched[0],"12:00"];
  if(k==="pm")return ["13:00",m.sched[1]];
  return ["",""];
}
// 午前休・午後休にチェックしたら、出社の時間を半日に合わせる（外したら所定に戻す）
function leaveAdjust(item,on){
  const wi=draft.rows.findIndex(x=>x.item==="work");if(wi<0)return;
  const w=draft.rows[wi],m=draft.m;
  if(item==="am"){const to=on?"13:00":m.sched[0],from=on?m.sched[0]:"13:00";if(w.start===from){w.start=to;$("#ed-s-"+wi).value=to;}}
  if(item==="pm"){const to=on?"12:00":m.sched[1],from=on?m.sched[1]:"12:00";if(w.end===from){w.end=to;$("#ed-e-"+wi).value=to;}}
}
function buildRows(m,list,ds){
  const rows=BASE.map(k=>({item:k,note:"",memo:"",on:false,base:true,
    start:defTime(k,m)[0],end:defTime(k,m)[1]}));
  list.forEach(e=>{let r=e.item==="custom"?null:rows.find(x=>x.item===e.item&&!x.on);
    if(!r){r={item:e.item,note:"",base:false};rows.push(r);}
    r.on=true;r.start=e.start;r.end=e.end;r.note=e.note||"";r.memo=e.memo||"";});
  // 予定が未登録の平日は「出社」にチェックを入れておく
  if(!list.length&&!S.edits[m.id+"|"+ds]&&!isWk(ds))rows[0].on=true;
  return rows;
}
function openEditor(mid,ds){
  const m=byId(mid),[y,mo,d]=ds.split("-").map(Number),dt=new Date(y,mo-1,d);
  const off=!isActive(m); // スタンバイ期間外（見た目は非活性だが編集はできる）
  draft={mid,ds,m,rows:buildRows(m,getEntries(mid,ds),ds),off};
  openLayer(`<div class="scrim"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="edTitle">
    <header>${avatar(m)}<div><h3 id="edTitle">${esc(m.name)}</h3><p class="num">${y}年${mo}月${d}日 (${WD[dt.getDay()]}) の勤務予定・実績${off?"（スタンバイ期間外）":""}</p></div></header>
    <div class="body" id="edBody"></div>
    <footer><span class="grow"></span><button class="btn" data-close>キャンセル</button><button class="btn btn-primary" id="edSave">保存</button></footer>
  </div></div>`);
  drawEditor();
  $("#edSave").addEventListener("click",saveEditor);
}
function rowName(r){return r.item==="custom"||r.item==="other"?(r.note||"自由記述"):ITEMS[r.item].label;}
function drawEditor(){
  const b=$("#edBody"),m=draft.m;
  let h=`<div class="itbl-wrap"><table class="itbl"><thead><tr><th>チェック</th><th>項目</th><th>時間</th><th>備考</th></tr></thead><tbody>`;
  draft.rows.forEach((r,i)=>{const it=ITEMS[r.item],name=rowName(r);
    let sub="";
    if(r.item==="work")sub=`<small class="hint">所定 ${showT(m.sched[0])}〜${showT(m.sched[1])}（${esc(m.sys)}）</small>`;
    h+=`<tr class="${r.on?"":"off"}" id="ed-r-${i}">
      <td class="ck"><input type="checkbox" id="ed-c-${i}" ${r.on?"checked":""} aria-label="${esc(name)}を登録"></td>
      <td class="it"><div class="itname">${it.mark?markHTML(it.mark):`<span class="dot" style="background:${it.dot}"></span>`}${r.item==="other"?`<input class="input itin" id="ed-n-${i}" value="${esc(r.note)}" maxlength="20" placeholder="任意で入力" title="自由記述の項目名（例：研修）" aria-label="自由記述の項目名">`:`<b>${esc(name)}</b>`}</div>${sub}</td>
      <td class="tm"><div class="tpair"><input class="input num tin" type="text" inputmode="numeric" maxlength="5" placeholder="--:--" autocomplete="off" id="ed-s-${i}" value="${r.start}" aria-label="${esc(name)} 開始"><span>〜</span><input class="input num tin" type="text" inputmode="numeric" maxlength="5" placeholder="--:--" autocomplete="off" id="ed-e-${i}" value="${r.end}" aria-label="${esc(name)} 終了"></div></td>
      <td class="memo"><input class="input memo-in" id="ed-m-${i}" value="${esc(r.memo||"")}" maxlength="100" placeholder="任意" aria-label="${esc(name)}の備考"></td></tr>`;});
  h+=`<tr class="addrow"><td></td><td colspan="3"><button class="addbtn" id="edAdd">${I.plus}項目を追加</button></td></tr>`;
  h+=`</tbody></table></div><p class="error" id="edErr" role="alert" hidden></p>`;
  b.innerHTML=h;
  draft.rows.forEach((r,i)=>{
    const c=$("#ed-c-"+i),row=$("#ed-r-"+i);
    c.addEventListener("change",()=>{row.classList.toggle("off",!c.checked);readRows();if(r.item==="am"||r.item==="pm")leaveAdjust(r.item,c.checked);});
    ["#ed-s-","#ed-e-"].forEach(p=>{const t=$(p+i);
      t.addEventListener("input",ev=>{const v=cleanTime(t.value);if(v!==t.value)t.value=v;if(v&&!c.checked){c.checked=true;row.classList.remove("off");}readRows();});
      t.addEventListener("blur",()=>{const v=normTime(t.value);if(v)t.value=v;readRows();});});
    const nm=document.getElementById("ed-n-"+i);
    if(nm)nm.addEventListener("input",()=>{if(nm.value.trim()&&!c.checked){c.checked=true;row.classList.remove("off");}});
  });
  // 「項目を追加」：項目名を自由に入力できる行を1行増やす
  $("#edAdd").addEventListener("click",()=>{readRows();
    draft.rows.push({item:"other",note:"",memo:"",on:true,base:false,start:"",end:""});
    drawEditor();const n=document.getElementById("ed-n-"+(draft.rows.length-1));if(n)n.focus();});
  if(draft.off)b.insertAdjacentHTML("afterbegin",`<p class="notice ro-note">スタンバイ期間外のメンバーです。予定は編集できます。平日の予定は必須ではありません。</p>`);
  
}
/* ---------- 時刻の入力（24時間表記 HH:MM） ---------- */
// 全角数字を半角にし、数字と「:」だけを残す
function cleanTime(v){return v.replace(/[０-９：]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)).replace(/[^0-9:]/g,"");}
// 「9:00」「900」「0900」などを「09:00」にそろえる。時刻として正しくなければ null
function normTime(v){v=cleanTime(String(v||"")).trim();let h,m,x;
  if((x=v.match(/^(\d{1,2}):(\d{1,2})$/))){h=+x[1];m=+x[2];}
  else if((x=v.match(/^(\d{1,2})(\d{2})$/))){h=+x[1];m=+x[2];}
  else if((x=v.match(/^(\d{1,2})$/))){h=+x[1];m=0;}
  else return null;
  return h<24&&m<60?pad(h)+":"+pad(m):null;}
function readRows(){draft.rows.forEach((r,i)=>{const c=$("#ed-c-"+i);if(!c)return;r.on=c.checked;const s=$("#ed-s-"+i).value.trim(),e=$("#ed-e-"+i).value.trim();r.start=normTime(s)||s;r.end=normTime(e)||e;const n=document.getElementById("ed-n-"+i);if(n)r.note=n.value.trim();const mm=document.getElementById("ed-m-"+i);if(mm)r.memo=mm.value.trim();});}
const checked=()=>draft.rows.filter(r=>r.on).map(r=>E(r.item,r.start,r.end,r.note,r.memo));
function validate(){
  for(const r of draft.rows){if(!r.on)continue;const n=rowName(r);
    if(r.item==="other"&&!r.note)return "チェックを入れた行の項目名を入力してください（例：研修）。";
    if(!r.start||!r.end)return `「${n}」の開始と終了の時刻を入力してください。`;
    if(!normTime(r.start)||!normTime(r.end))return `「${n}」の時刻は 00:00〜23:59 の形で入力してください（例：09:00）。`;
    if(toMin(r.end)<=toMin(r.start))return `「${n}」の終了時刻を開始時刻より後にしてください。`;}
  return "";
}
function saveEditor(){
  readRows();const msg=validate(),err=$("#edErr");
  if(msg){err.textContent=msg;err.hidden=false;return;}
  // スタンバイ期間中のメンバーは、平日（月〜金）に予定が1つ以上必要
  if(isActive(draft.m)&&!isWk(draft.ds)&&!checked().length){
    err.textContent="平日の予定を空にはできません。スタンバイ期間中のメンバーは、月〜金に予定を1つ以上入れてください（休む日は「有給」など）。";
    err.hidden=false;return;
  }
  S.edits[draft.mid+"|"+draft.ds]=checked().sort((a,b)=>toMin(a.start)-toMin(b.start));
  if(S.edits[draft.mid+"|"+draft.ds].length)S.lastAdded[draft.mid]=ymd(TODAY); // 予定を追加した日を記録
  persist();closeLayer();render();toast("勤務予定を保存しました");
}
