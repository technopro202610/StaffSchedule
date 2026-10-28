/* =========================================================
   No1 ログイン画面
   ログイン・ログアウトと、ログイン後にカレンダーへ入る処理（enterApp）。
   ========================================================= */
"use strict";

/* ---------- Login ---------- */
const loginUser=$("#loginUser");
$("#showPw").addEventListener("change",e=>{$("#loginPw").type=e.target.checked?"text":"password";});

// サーバーから受け取ったユーザーを画面のメンバーに結び付ける
// （スケジュールはまだダミーデータ。初期データの12名はメールアドレスで一致する）
function signedIn(u){
  const mail=String(u.email).toLowerCase();
  let m=MEMBERS.find(x=>x.mail===mail);
  if(!m){m={id:"u"+u.userId,mail,name:u.name,kana:"",dept:"未設定",teams:u.name,sys:"標準勤務",sched:["09:00","18:00"],registered:true};MEMBERS.push(m);sortMembers();}
  S.user=m.id;enterApp();
}


$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();const err=$("#loginErr");
  $("#loginOk").hidden=true;
  const id=loginUser.value.trim().toLowerCase(),pw=$("#loginPw").value;
  if(!id||!pw){err.textContent="ID（メールアドレス）とパスワードを入力してください。";err.hidden=false;(id?$("#loginPw"):loginUser).focus();return;}
  // ---- サーバーで照合（成功するとCookieが発行される）----
  const btn=e.submitter||$("#loginForm button[type=submit]");btn.disabled=true;
  try{
    const r=await api("POST","/api/auth/login",{email:id,password:pw});
    if(!r.ok){err.textContent=(r.data&&r.data.message)||"ログインできませんでした。時間をおいてもう一度お試しください。";err.hidden=false;return;}
    err.hidden=true;$("#loginPw").value="";signedIn(r.data);
  }catch(x){err.textContent="サーバーに接続できません。バックエンドが起動しているか確認してください。";err.hidden=false;}
  finally{btn.disabled=false;}
});
$("#logoutBtn").addEventListener("click",()=>{api("POST","/api/auth/logout").catch(()=>{});S.user=null;persist();$("#loginPw").value="";$("#app").hidden=true;showScreen("login");$("#loginOk").hidden=true;closeLayer();});
function enterApp(){
  const purged=purgeExpired();
  const me=byId(S.user);if(!me){S.user=null;return;}
  $("#login").hidden=true;$("#app").hidden=false;
  render();
  showLoginNotice(purged); // 削除予定・削除したメンバーをポップアップでお知らせ
}
