/* =========================================================
   No2 新規会員登録画面
   ========================================================= */
"use strict";

/* ---------- User registration ---------- */
$("#toReg").addEventListener("click",()=>{$("#regForm").reset();["regName","regMail","regPw","regPw2"].forEach(k=>fieldErr(k,""));showScreen("register");$("#regName").focus();});
$("#toLogin").addEventListener("click",()=>showScreen("login"));
$("#regShowPw").addEventListener("change",e=>{$("#regPw").type=$("#regPw2").type=e.target.checked?"text":"password";});
function fieldErr(id,msg){const el=$("#"+id),er=$("#"+id+"-err");el.classList.toggle("bad",!!msg);er.textContent=msg;er.hidden=!msg;}
$("#regForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const name=$("#regName").value.trim().replace(/\u3000/g," ").replace(/\s+/g," ");
  const mail=$("#regMail").value.trim().toLowerCase(),pw=$("#regPw").value,pw2=$("#regPw2").value;
  const errs={
    regName:!name?"名前を入力してください。":"",
    regMail:!mail?"メールアドレスを入力してください。":!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)?"メールアドレスの形式が正しくありません（例：yamada.taro@example.com）。":"",
    regPw:!pw?"パスワードを入力してください。":(pw.length<8||!/[A-Za-z]/.test(pw)||!/\d/.test(pw))?"8文字以上で、英字と数字を両方含めてください。":"",
    regPw2:!pw2?"確認のため、もう一度パスワードを入力してください。":pw2!==pw?"上のパスワードと一致しません。":""
  };
  let first=null;for(const k in errs){fieldErr(k,errs[k]);if(errs[k]&&!first)first=k;}
  if(first){$("#"+first).focus();return;}
  // ---- サーバーへ登録（重複チェック・ハッシュ化・DB保存はサーバー側）----
  const btn=e.submitter||$("#regForm button[type=submit]");btn.disabled=true;
  let r;
  try{r=await api("POST","/api/auth/register",{name,email:mail,password:pw,passwordConfirm:pw2});}
  catch(x){fieldErr("regName","サーバーに接続できません。バックエンドが起動しているか確認してください。");btn.disabled=false;return;}
  btn.disabled=false;
  if(!r.ok){
    const map={name:"regName",email:"regMail",password:"regPw",passwordConfirm:"regPw2"};
    const se=(r.data&&r.data.errors)||{};let f=null;
    for(const k in map){fieldErr(map[k],se[k]||"");if(se[k]&&!f)f=map[k];}
    if(!f){fieldErr("regName",(r.data&&r.data.message)||"登録できませんでした。時間をおいてもう一度お試しください。");f="regName";}
    $("#"+f).focus();return;
  }
  showScreen("login");loginUser.value=mail;$("#loginPw").value="";$("#loginErr").hidden=true;
  const ok=$("#loginOk");ok.textContent=`${name} さんを登録しました。パスワードを入力してログインしてください。`;ok.hidden=false;$("#loginPw").focus();
});
