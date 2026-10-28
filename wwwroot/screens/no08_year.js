/* =========================================================
   No8 年間カレンダー（日付選択）
   ========================================================= */
"use strict";

/* ---------- 12-month calendar popover ---------- */
function placePop(pop,anchor){const r=anchor.getBoundingClientRect();const w=pop.offsetWidth;let left=r.right+window.scrollX-w;left=Math.max(16+window.scrollX,Math.min(left,window.scrollX+document.documentElement.clientWidth-w-16));pop.style.left=left+"px";pop.style.top=(r.bottom+window.scrollY+8)+"px";}
function calHTML(){
  const y=S.calYear,ty=TODAY.getFullYear(),lo=dayMin(),hi=dayMax();let h=`<div class="cal-head"><button class="ghost" data-cal="-1" aria-label="前の年"${y<=ty-1?" disabled":""}>${I.prev}</button><b class="num">${y}年</b><button class="ghost" data-cal="1" aria-label="次の年"${y>=ty+1?" disabled":""}>${I.next}</button></div><div class="months">`;
  const selFrom=ymd(S.week),selTo=ymd(addDays(S.week,6));
  for(let mo=0;mo<12;mo++){
    h+=`<div class="mon"><h4>${y}年${mo+1}月</h4><table><thead><tr>${[..."日月火水木金土"].map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody><tr>`;
    const first=new Date(y,mo,1),n=new Date(y,mo+1,0).getDate();
    for(let i=0;i<first.getDay();i++)h+="<td></td>";
    for(let d=1;d<=n;d++){const dt=new Date(y,mo,d),ds=ymd(dt);if(dt.getDay()===0&&d>1)h+="</tr><tr>";
      const c=[],hol=holidayName(dt);if(hol)c.push("hol");if(ds>=selFrom&&ds<=selTo)c.push("sel");if(sameDay(dt,TODAY))c.push("td");
      const out=ds<lo||ds>hi;
      h+=`<td><button class="${c.join(" ")} num"${out?' disabled title="表示できる期間（今日の前後1年）の外です"':` data-date="${ds}"`} aria-label="${y}年${mo+1}月${d}日${hol?"（"+hol+"）":""}"${hol?` title="${hol}"`:""}>${d}</button></td>`;}
    h+="</tr></tbody></table></div>";}
  h+=`</div><div class="cal-foot">今日: <span class="num">${TODAY.getFullYear()}/${pad(TODAY.getMonth()+1)}/${pad(TODAY.getDate())}</span></div>`;return h;
}
$("#calBtn").addEventListener("click",e=>{e.stopPropagation();if(document.getElementById("calPop")){closeLayer();return;} // 開いていればもう一度押すと閉じる
  S.calYear=S.week.getFullYear();
  openLayer(`<div class="pop cal-pop" role="dialog" aria-label="日付を選択" id="calPop">${calHTML()}</div>`);placePop($("#calPop"),$("#calBtn"));});
