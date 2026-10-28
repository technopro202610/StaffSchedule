/* =========================================================
   No9 パスワード再設定画面
   ① 申請 → ③ 新しいパスワード → ④ リンクが無効。画面の切り替え（showScreen）もここ。
   ========================================================= */
"use strict";

/* ---------- パスワード再設定 ---------- */
const AUTH_SCREENS=["login","register","forgot","forgotSent","reset","resetInvalid"];
function showScreen(name){AUTH_SCREENS.forEach(s=>{$("#"+s).hidden=s!==name;});window.scrollTo(0,0);}
const isMail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function pwErrors(pw,pw2){
  return {
    rsPw:!pw?"新しいパスワードを入力してください。":(pw.length<8||!/[A-Za-z]/.test(pw)||!/\d/.test(pw))?"8文字以上で、英字と数字を両方含めてください。":"",
    rsPw2:!pw2?"確認のため、もう一度入力してください。":pw2!==pw?"上のパスワードと一致しません。":""
  };
}
function openForgot(){
  $("#fgForm").reset();fieldErr("fgMail","");
  const cur=$("#loginUser").value.trim();if(cur)$("#fgMail").value=cur; // ログイン画面で入力済みなら引き継ぐ
  showScreen("forgot");$("#fgMail").focus();
}
function openReset(label){
  $("#rsForm").reset();fieldErr("rsPw","");fieldErr("rsPw2","");$("#rsErr").hidden=true;
  $("#rsFor").textContent=label?`${label} の新しいパスワードを入力してください`:"新しいパスワードを入力してください";
  showScreen("reset");$("#rsPw").focus();
}
function backToLogin(okMsg,mail){
  showScreen("login");$("#loginErr").hidden=true;
  const ok=$("#loginOk");ok.textContent=okMsg||"";ok.hidden=!okMsg;
  if(mail){$("#loginUser").value=mail;$("#loginPw").value="";$("#loginPw").focus();}
}
$("#forgotBtn").addEventListener("click",openForgot);
$("#fgBack").addEventListener("click",()=>backToLogin());

$("#riBack").addEventListener("click",()=>backToLogin());
$("#riRetry").addEventListener("click",openForgot);
$("#rsShowPw").addEventListener("change",e=>{$("#rsPw").type=$("#rsPw2").type=e.target.checked?"text":"password";});
// URL の ?reset=<トークン> をメールのリンクとして扱う
let resetToken=null;
$("#fgForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const mail=$("#fgMail").value.trim().toLowerCase();
  const msg=!mail?"メールアドレスを入力してください。":!isMail(mail)?"メールアドレスの形式が正しくありません。\n（例：taro.yamada@technopro.com）":"";
  fieldErr("fgMail",msg);if(msg){$("#fgMail").focus();return;}
  const btn=e.submitter||$("#fgForm button[type=submit]");btn.disabled=true;
  try{
    const r=await api("POST","/api/auth/password-reset/request",{email:mail});
    if(!r.ok){fieldErr("fgMail",(r.data&&r.data.message)||"送信できませんでした。時間をおいてもう一度お試しください。");return;}
    // サーバーは登録の有無にかかわらず同じ応答を返す
    $("#fsTo").textContent=mail;showScreen("forgotSent");
  }catch(x){fieldErr("fgMail","サーバーに接続できません。バックエンドが起動しているか確認してください。");}
  finally{btn.disabled=false;}
});
$("#rsForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const pw=$("#rsPw").value,pw2=$("#rsPw2").value,errs=pwErrors(pw,pw2);
  let first=null;for(const k in errs){fieldErr(k,errs[k]);if(errs[k]&&!first)first=k;}
  if(first){$("#"+first).focus();return;}
  const btn=e.submitter||$("#rsForm button[type=submit]");btn.disabled=true;
  try{
    const r=await api("POST","/api/auth/password-reset/confirm",{token:resetToken,password:pw,passwordConfirm:pw2});
    if(r.status===410){showScreen("resetInvalid");return;}
    if(!r.ok){
      const se=(r.data&&r.data.errors)||{};
      fieldErr("rsPw",se.password||"");fieldErr("rsPw2",se.passwordConfirm||"");
      if(!se.password&&!se.passwordConfirm){const er=$("#rsErr");er.textContent=(r.data&&r.data.message)||"変更できませんでした。";er.hidden=false;}
      return;
    }
    resetToken=null;history.replaceState(null,"",location.pathname); // 使い終わったトークンをURLから消す
    backToLogin("パスワードを変更しました。新しいパスワードでログインしてください。",r.data&&r.data.email);
  }catch(x){const er=$("#rsErr");er.textContent="サーバーに接続できません。バックエンドが起動しているか確認してください。";er.hidden=false;}
  finally{btn.disabled=false;}
});
// メールのリンク（?reset=…）から開かれたときは、まずトークンが使えるか確かめる
async function startFromResetLink(){
  const t=new URLSearchParams(location.search).get("reset");
  if(!t)return false;
  resetToken=t;
  try{
    const r=await api("GET","/api/auth/password-reset/verify?token="+encodeURIComponent(t));
    if(r.ok)openReset(r.data&&(r.data.name?r.data.name+" さん":r.data.email));else showScreen("resetInvalid");
  }catch(x){showScreen("resetInvalid");}
  return true;
}
