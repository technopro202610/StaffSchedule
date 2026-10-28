/* =========================================================
   共通部品（全画面で使う）
   アイコン・予定の項目・ダミーメンバー・日付・保存データ（S）・api()・トースト・祝日 など。
   一番最初に読み込みます。ここにある関数・定数は、ほかのどのファイルからも使えます。
   ========================================================= */
"use strict";

/* ---------- Icons ---------- */
const I={
  normal:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></svg>',
  late:'<svg class="icon" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-8 8"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  early:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l-3 3"/></svg>',
  shift:'<svg class="icon" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  out:'<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/></svg>',
  other:'<svg class="icon" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>',
  caret:'<svg class="icon caret" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  chev:'<svg class="icon chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  close:'<svg class="icon" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  trash:'<svg class="icon" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  prev:'<svg class="icon" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  next:'<svg class="icon" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  plus:'<svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
};
I.gyo='<svg class="icon" viewBox="0 0 24 24"><path d="M9 4h6v3H9zM7 5H5v16h14V5h-2"/><path d="M9 14l2 2 4-4"/></svg>';
I.paid='<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
I.am='<svg class="icon" viewBox="0 0 24 24"><path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v4M5.6 9.6 7 11M18.4 9.6 17 11"/></svg>';
I.pm='<svg class="icon" viewBox="0 0 24 24"><path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 3v6M9.5 6.5 12 9l2.5-2.5"/></svg>';
I.home='<svg class="icon" viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/></svg>';
I.health='<svg class="icon" viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><path d="M9 11h6M12 8v6"/></svg>';
I.memo='<svg class="icon" viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>';
I.tag='<svg class="icon" viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/></svg>';
// 登録画面の項目マスタ（count=実働に含める）
const ITEMS={
  work:{label:"出社",dot:"#2563eb",mark:"🏢",count:true},
  home:{label:"在宅",dot:"#16a34a",mark:"🏠",count:true},
  health:{label:"健康診断",dot:"#db2777",mark:"🏥",count:false},
  am:{label:"午前休",dot:"#ea8a0c",mark:"☀️",count:false},
  pm:{label:"午後休",dot:"#e0ad0b",mark:"🌇",count:false},
  gyo:{label:"業確",dot:"#7c3aed",mark:"📌",count:true},
  paid:{label:"有給",dot:"#dc2626",mark:"🐼",count:false},
  other:{label:"自由記述",dot:"#0ea5e9",mark:"rain-j",count:false},
  out:{label:"外出（客先訪問）",dot:"#0d9488",count:true,def:["10:00","16:00"]},
  shift:{label:"遅出",dot:"#7c3aed",count:true,def:["11:00","20:00"]},
  custom:{label:"",dot:"#3b82f6",count:false}
};
// 予定登録の画面に、いつも並べる項目（この順番でチェックボックスを表示）
// マーク：絵文字、または「文字の雨」（小さな四角の中を文字がゆっくり下から上へ流れる）
const RAINS={"rain-j":{name:"文字の雨（がじゅまる）",cls:"rain-j",txt:"がじゅまる・ガジュマル・がじゅまる・ガジュマル・"}};
function rainHTML(id){const r=RAINS[id];const cols=[0,1].map(k=>{const t=r.txt.slice(k*11)+r.txt.slice(0,k*11);
  return `<i style="left:${6+k*48}%;animation-delay:-${k*10}s;animation-duration:${24+k*6}s">${[...t].join("<br>")}</i>`;}).join("");
  return `<span class="rain ${r.cls}">${cols}</span>`;}
function markHTML(e){return `<span class="mark" aria-hidden="true">${RAINS[e]?rainHTML(e):e}</span>`;}
const BASE=["work","home","paid","am","pm","gyo","health","other"];
// グリッドでの表示区分（出社は「通常勤務」と表示する）
const DISP={
  normal:{label:"通常勤務",cls:"t-normal",icon:"normal",mark:"🏢"},
  shift:{label:"遅出",cls:"t-shift",icon:"shift"},
  out:{label:"外出（客先訪問）",cls:"t-out",icon:"out"},
  am:{label:"午前休",cls:"t-late",icon:"am",mark:"☀️"},
  pm:{label:"午後休",cls:"t-oth",icon:"pm",mark:"🌇"},
  gyo:{label:"業確",cls:"t-shift",icon:"gyo",mark:"📌"},
  home:{label:"在宅",cls:"t-out",icon:"home",mark:"🏠"},
  health:{label:"健康診断",cls:"t-early",icon:"health",mark:"🏥"},
  paid:{label:"有給",cls:"t-gyo",icon:"paid",mark:"🐼"},
  other:{label:"自由記述",cls:"t-leave",icon:"other",mark:"rain-j"},
  custom:{label:"",cls:"t-cus",icon:"tag"}
};

/* ---------- Dummy members (unique, sorted by kana) ---------- */
const ROMA={m01:"aoki.hanako",m02:"kato.misaki",m03:"kobayashi.tatsuya",m04:"sato.kenta",m05:"suzuki.ichiro",m06:"takahashi.kenta",m07:"tanaka.naoki",m08:"nakamura.miho",m09:"yamada.taro",m10:"yamamoto.yuka",m11:"yoshida.sakura",m12:"watanabe.ryo",m13:"inoue.tsubasa"};
const MEMBERS=[
  ["m01","青木 花子","アオキ ハナコ","総務部"],["m02","加藤 美咲","カトウ ミサキ","営業1課"],
  ["m03","小林 竜也","コバヤシ タツヤ","システム課"],["m04","佐藤 健太","サトウ ケンタ","営業1課"],
  ["m05","鈴木 一郎","スズキ イチロウ","システム課"],["m06","高橋 健太","タカハシ ケンタ","営業2課"],
  ["m07","田中 直樹","タナカ ナオキ","サポート課"],["m08","中村 みほ","ナカムラ ミホ","総務部"],
  ["m09","山田 太郎","ヤマダ タロウ","営業2課"],["m10","山本 由香","ヤマモト ユカ","サポート課"],
  ["m11","吉田 さくら","ヨシダ サクラ","システム課"],["m12","渡辺 涼","ワタナベ リョウ","サポート課"],
  ["m13","井上 翼","イノウエ ツバサ","営業2課"] // デモ用：ログインしたときに自動で削除されるメンバー
].map(([id,name,kana,dept])=>{
  const sys=id==="m05"?["早番勤務","08:30","17:30"]:id==="m11"?["遅番勤務","10:00","19:00"]:["標準勤務","09:00","18:00"];
  return {id,mail:ROMA[id]+"@example.com",name,kana,dept,teams:name,sys:sys[0],sched:[sys[1],sys[2]]};});
const sortKey=m=>m.kana||m.name;
function sortMembers(){MEMBERS.sort((a,b)=>sortKey(a).localeCompare(sortKey(b),"ja"));}

const GYOU=[["アイウエオ","#4f8ff0"],["カキクケコガギグゲゴ","#5f9a6a"],["サシスセソザジズゼゾ","#e0567f"],["タチツテトダヂヅデド","#2a9fb0"],["ナニヌネノ","#f08a3c"],["ハヒフヘホバビブベボパピプペポ","#c27c3e"],["マミムメモ","#8a6fd1"],["ヤユヨ","#1d9a8f"],["ラリルレロ","#5b7bd5"],["ワヲン","#8c5fd6"]];
function avColor(k){const c=k[0];for(const[s,col]of GYOU)if(s.includes(c))return col;return "#667085";}
function avatar(m,sm){return `<span class="av${sm?" sm":""}" style="background:${memberColor(m)}" aria-hidden="true">${sortKey(m)[0]}</span>`;}

/* ---------- Dates ---------- */
// 今日の日付（パソコンの日付から取る。時刻は 0:00 にそろえる）
const TODAY=(()=>{const n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate());})();
const WD="日月火水木金土";
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
const mondayOf=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x;};
const sameDay=(a,b)=>ymd(a)===ymd(b);
const toMin=t=>{const[a,b]=t.split(":").map(Number);return a*60+b;};
const hm=m=>`${Math.floor(m/60)}:${pad(m%60)}`;
const showT=t=>t.replace(/^0/,"");

/* ---------- Schedule data ---------- */
function rnd(str){let x=2166136261;for(let i=0;i<str.length;i++){x^=str.charCodeAt(i);x=Math.imul(x,16777619);}x^=x>>>13;x=Math.imul(x,1274126177);return ((x^(x>>>16))>>>0)/4294967296;}
const E=(item,start,end,note,memo)=>({item,start,end,note:note||"",memo:memo||""}); // note=自由入力の項目名、memo=備考（任意）
const toT=m=>`${pad(Math.floor(m/60))}:${pad(m%60)}`;
// 2026/10/19週はモックアップの内容を再現
const FIXED={
  "m01|2026-10-21":[E("work","09:45","18:00")],
  "m02|2026-10-23":[E("work","09:00","15:00")],
  "m04|2026-10-20":[E("gyo","09:00","12:00"),E("work","13:00","18:00")],
  "m06|2026-10-22":[E("work","09:25","18:00")],
  "m07|2026-10-21":[E("work","09:15","18:00")],
  "m07|2026-10-23":[E("work","09:00","16:00")],
  "m08|2026-10-22":[E("other","11:00","20:00","遅出")],
  "m09|2026-10-23":[E("home","09:00","18:00")],
  "m10|2026-10-23":[E("work","10:15","18:00")],
  "m12|2026-10-20":[E("work","09:00","15:30")],
  "m03|2026-10-21":[E("work","09:30","18:00")],
  "m10|2026-10-22":[E("am","09:00","12:00"),E("work","13:00","18:00")],
  "m02|2026-10-21":[E("work","09:00","12:00"),E("pm","13:00","18:00")],
  "m11|2026-10-19":[E("paid","10:00","19:00")]
};
const MOCK_WEEK=["2026-10-19","2026-10-25"];
function generate(mid,ds){
  const d=new Date(ds.slice(0,4),ds.slice(5,7)-1,ds.slice(8));
  if(d.getDay()===0||d.getDay()===6)return [];
  const k=mid+"|"+ds,m=byId(mid),[s,e]=m.sched;
  // 新しく追加したメンバーは、平日に所属の勤務システムの所定時間（通常勤務）を初期値として入れておく
  if(m.registered)return [E("work",s,e)];
  if(FIXED[k])return FIXED[k].map(x=>({...x}));
  if(ds>=MOCK_WEEK[0]&&ds<=MOCK_WEEK[1])return [E("work",s,e)];
  const r=rnd(k),r2=rnd(k+"#");
  if(r<.06)return [E("work",toT(toMin(s)+[15,25,30,45,75][Math.floor(r2*5)]),e)];
  if(r<.10)return [E("work",s,toT(toMin(e)-[180,150,120,90][Math.floor(r2*4)]))];
  if(r<.13)return [E("other","11:00","20:00","遅出")];
  if(r<.17)return [E("home",s,e)];
  if(r<.20)return [E("gyo",s,toT(toMin(s)+180)),E("work",toT(toMin(s)+240),e)];
  if(r<.23)return [E("paid",s,e)];
  if(r<.24)return [E("am",s,"12:00"),E("work","13:00",e)];
  if(r<.25)return [E("work",s,"12:00"),E("pm","13:00",e)];
  if(r<.26)return [E("work",s,e),E("other","16:00","17:00",["研修","定例会議","面談"][Math.floor(r2*3)])];
  return [E("work",s,e)];
}
function disp(e,m,list){
  if(e.item==="work")return {...DISP.normal};
  const d={...DISP[e.item]};
  if(e.item==="custom")d.label=e.note||"項目";
  if(e.item==="other")d.label=e.note||"自由記述";
  return d;
}

/* ---------- State ---------- */
const STORE="standby-schedule-v5";
const DELETE_MONTHS=6; // スタンバイ期間外のまま何か月予定が追加されないと削除するか
// デモ用：鈴木さんの期間外の開始日（いつ開いても「あと10日で削除」になるように今日から計算）
// デモ用のダミーデータ：ログイン時の「削除予定のお知らせ」が出るように、スタンバイ期間外のメンバーを用意する
//   削除まで n 日になるように、期間外になった日を今日から逆算する（いつ開いても同じ見え方になる）
const offSince=n=>ymd(addDays(new Date(TODAY.getFullYear(),TODAY.getMonth()-DELETE_MONTHS,TODAY.getDate()),n));
const demoInactive=()=>({
  m12:{since:offSince(2)},   // 渡辺 涼   ：あと約3日で削除（お知らせに出る）
  m08:{since:offSince(7)},   // 中村 みほ ：あと約8日で削除（お知らせに出る）
  m05:{since:offSince(10)},  // 鈴木 一郎 ：あと約11日で削除（お知らせに出る）
  m11:{since:offSince(60)},  // 吉田 さくら：期間外だが削除はまだ先（お知らせには出ない）
  m13:{since:offSince(-5)}   // 井上 翼   ：削除日を過ぎている → ログインしたときに自動で削除される
});
// 前に削除されたメンバーの記録（お知らせの「削除済み」に出る）
// この1か月に削除された20人（何日前に削除したか・手動で削除したか）＋1か月より前の1人（お知らせには出ない）
const DEMO_DELETED=[
  ["前田 健一",20],["石川 真由",1,true],["森本 拓海",2],["西村 彩",3],["松井 大和",4,true],
  ["岡田 美穂",5],["藤田 翔",6],["長谷川 恵",8],["村上 颯太",9,true],["近藤 千尋",11],
  ["坂本 陽菜",12],["遠藤 悠真",14],["青山 理沙",15,true],["福田 蓮",17],["太田 結衣",18],
  ["三浦 大地",21],["原田 美咲",23,true],["小松 健",25],["中島 花音",27],["横山 隼人",29],
  ["岡本 大輔",45] // 1か月より前なので、お知らせには出ない
];
const demoDeletedLog=()=>DEMO_DELETED.map(([name,ago,manual])=>({name,date:ymd(addDays(TODAY,-ago)),manual:!!manual}))
  .sort((a,b)=>a.date<b.date?1:-1); // 新しい順
let saved={};try{saved=JSON.parse(localStorage.getItem(STORE)||"{}")||{};}catch(e){saved={};}
(saved.members||[]).forEach(u=>{if(!MEMBERS.some(x=>x.id===u.id))MEMBERS.push(u);});
// 編集した名前・ふりがな { member_id: {name, kana} }
Object.entries(saved.renamed||{}).forEach(([id,v])=>{const m=MEMBERS.find(x=>x.id===id);if(m){m.name=v.name;m.kana=v.kana;m.teams=v.name;}});
sortMembers();
const S={
  user:saved.user||null,
  week:mondayOf(TODAY),
  q:"",
  set:Object.assign({activeOpen:true,inactiveOpen:true},saved.set||{}),
  // メンバー一覧のチェック { member_id: true/false }。まだ触っていない人は「スタンバイ期間中ならチェックあり」
  pick:saved.pick||{},
  sel:{}, // メンバー一覧で☑を変えたが、まだボタンで反映していない分 { member_id: true/false }
  renamed:saved.renamed||{},
  edits:saved.edits||{},
  members:saved.members||[],
  colors:saved.colors||{},
  // スタンバイ期間外の人 { member_id: { since: 期間外になった日 } }。デモ用に鈴木 一郎さんを 2025/11/15 から期間外にしておく
  inactive:saved.inactive||demoInactive(),
  lastAdded:saved.lastAdded||{}, // 最後に予定を追加した日 { member_id: "YYYY-MM-DD" }
  deleted:saved.deleted||[],     // 自動削除されたメンバー
  deletedLog:saved.deletedLog||demoDeletedLog(), // 削除の記録（お知らせに表示） [{name, date}]
  notified:saved.notified||{},
  notiRead:saved.notiRead||{},     // お知らせ一覧で見た削除予定（お知らせの数字に使う）     // ログイン時にお知らせ済みのメンバー { ログインした人のID: { member_id: 削除予定日 } }
  users:saved.users||[],
  calYear:TODAY.getFullYear()
};
for(const k in S.inactive){if(S.inactive[k]===true)S.inactive[k]={since:ymd(TODAY)};} // 古い保存形式を直す
const BUILTIN=[...MEMBERS];
for(const id of S.deleted){const i=MEMBERS.findIndex(x=>x.id===id);if(i>=0)MEMBERS.splice(i,1);}
function persist(){try{localStorage.setItem(STORE,JSON.stringify({user:S.user,set:S.set,edits:S.edits,members:S.members,colors:S.colors,inactive:S.inactive,lastAdded:S.lastAdded,deleted:S.deleted,deletedLog:S.deletedLog,notified:S.notified,notiRead:S.notiRead,users:S.users,pick:S.pick,renamed:S.renamed}));}catch(e){}}
function getEntries(mid,ds){const k=mid+"|"+ds;return S.edits[k]?S.edits[k].map(e=>({...e})):generate(mid,ds);}

/* ---------- Helpers ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const byId=id=>MEMBERS.find(m=>m.id===id);
function toast(msg){document.querySelectorAll(".toast").forEach(x=>x.remove());const t=document.createElement("div");t.className="toast";t.textContent=msg;t.setAttribute("role","status");document.body.appendChild(t);setTimeout(()=>t.remove(),2200);}
const layer=$("#layer");
function closeLayer(){const wasNoti=!!document.getElementById("notiPop");layer.innerHTML="";if(wasNoti)markNotiRead(); // お知らせ一覧を閉じた瞬間に数字を消す
  document.removeEventListener("keydown",escClose);}
function escClose(e){if(e.key==="Escape")closeLayer();}
function openLayer(html){const wasNoti=!!document.getElementById("notiPop");layer.innerHTML=html;if(wasNoti)markNotiRead();document.addEventListener("keydown",escClose);}


/* ---------- API（C# バックエンド）との通信 ---------- */
async function api(method,path,body){
  const res=await fetch(path,{method,credentials:"same-origin",
    headers:body===undefined?{}:{"Content-Type":"application/json"},
    body:body===undefined?undefined:JSON.stringify(body)});
  let data=null;try{data=await res.json();}catch(x){}
  return {ok:res.ok,status:res.status,data};
}

/* ---------- 日本の祝日（カレンダーで赤く表示する） ---------- */
// n月の第k月曜日
const nthMonday=(y,m,k)=>{const f=new Date(y,m-1,1).getDay();return 1+((8-f)%7)+(k-1)*7;};
// 祝日法の決まりどおりの祝日（振替休日・国民の休日を除く）
function baseHoliday(dt){
  const y=dt.getFullYear(),m=dt.getMonth()+1,d=dt.getDate(),k=y-1980,q=Math.floor(k/4);
  const fixed={"1-1":"元日","2-11":"建国記念の日","2-23":"天皇誕生日","4-29":"昭和の日","5-3":"憲法記念日","5-4":"みどりの日","5-5":"こどもの日","8-11":"山の日","11-3":"文化の日","11-23":"勤労感謝の日"};
  if(fixed[m+"-"+d])return fixed[m+"-"+d];
  if(m===1&&d===nthMonday(y,1,2))return "成人の日";
  if(m===7&&d===nthMonday(y,7,3))return "海の日";
  if(m===9&&d===nthMonday(y,9,3))return "敬老の日";
  if(m===10&&d===nthMonday(y,10,2))return "スポーツの日";
  if(m===3&&d===Math.floor(20.8431+0.242194*k-q))return "春分の日";
  if(m===9&&d===Math.floor(23.2488+0.242194*k-q))return "秋分の日";
  return "";
}
const HOL_CACHE={};
// 祝日なら名前を返す（祝日でなければ ""）
function holidayName(dt){
  const key=ymd(dt);if(key in HOL_CACHE)return HOL_CACHE[key];
  let n=baseHoliday(dt);
  if(!n){ // 振替休日：日曜日の祝日のあと、最初の祝日でない日
    let p=addDays(dt,-1);while(baseHoliday(p)){if(p.getDay()===0){n="振替休日";break;}p=addDays(p,-1);}
  }
  if(!n&&dt.getDay()!==0&&baseHoliday(addDays(dt,-1))&&baseHoliday(addDays(dt,1)))n="国民の休日"; // 祝日にはさまれた日
  return HOL_CACHE[key]=n;
}


/* ---------- メンバーの表示色（フリガナの行で自動） ---------- */
// 色を選んでいなければ、フリガナの行（ア行・カ行…）で自動の色にする
function memberColor(m){return (S.colors&&S.colors[m.id])||avColor(sortKey(m));}


const toKata=s=>s.replace(/[\u3041-\u3096]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60));
// カタカナ → ひらがな（画面に出すとき・入力欄で使う）
const toHira=s=>(s||"").replace(/[\u30a1-\u30f6]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
const spaces=s=>s.replace(/\u3000/g," ").trim().replace(/\s+/g," ");
