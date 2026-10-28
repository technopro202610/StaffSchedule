using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StaffSchedule.Models;
using StaffSchedule.Services;

namespace StaffSchedule.Controllers;

/// <summary>
/// 【No1 ログイン画面】から呼ばれるAPI。
///   POST /api/auth/login    … ログイン（成功するとCookieを発行）
///   POST /api/auth/logout   … ログアウト（Cookieを削除）
///   GET  /api/auth/me       … ログイン中のユーザー（画面を開き直したときの確認用）
/// 画面側：wwwroot/screens/no01_login.js
/// </summary>
[ApiController]
[Route("api/auth")]
public sealed class LoginController : ControllerBase
{
    // ログインに失敗したときのメッセージ（IDとパスワードのどちらが違うかは教えない）
    private const string LoginFailedMessage = "IDまたはパスワードが違います。入力内容を確認してください。";

    // ログインのルールを持つ係（Program.cs で登録したものが自動で渡される）
    private readonly LoginService _login;

    public LoginController(LoginService login) => _login = login;

    // ---------------------------------------------------------
    //  ログイン
    // ---------------------------------------------------------
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // 1. メールアドレスとパスワードを照合する（ルールは LoginService）
        var user = await _login.LoginAsync(request);

        // 2. 失敗したら 401（認証エラー）を返す
        if (user is null)
        {
            return Unauthorized(new ErrorResponse(LoginFailedMessage)); // 401
        }

        // 3. 成功したら、Cookie に入れておく情報（クレーム）を作る
        //    次からのリクエストでは、この情報で「だれがログイン中か」がわかる
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new(ClaimTypes.Name, user.DisplayName),
            new(ClaimTypes.Email, user.Email),
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);

        // 4. Cookie を発行して、ログイン状態にする
        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = false }); // ブラウザを閉じたらログアウト

        // 5. 200（成功）と、ユーザー情報（パスワードは含めない）を返す
        return Ok(UserResponse.From(user)); // 200
    }

    // ---------------------------------------------------------
    //  ログアウト
    // ---------------------------------------------------------
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        // Cookie を消して、ログアウトの状態にする
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent(); // 204
    }

    // ---------------------------------------------------------
    //  ログイン中のユーザー（画面を開き直したとき、Cookie が有効か確かめる）
    // ---------------------------------------------------------
    // [Authorize]：ログインしていない（Cookie がない）ときは、ここに来る前に 401 が返る
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        // 1. Cookie の中の利用者IDを取り出す（取り出せなければ 401）
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out int userId))
        {
            return Unauthorized(new ErrorResponse("ログインしてください。"));
        }

        // Cookieが残っていても、DB側で削除・利用停止されていたらログアウト扱いにする
        // 2. DB でユーザーを確かめる
        var user = await _login.FindByIdAsync(userId);

        // 3. 削除・利用停止されていたら、Cookie を消して 401
        if (user is null || !user.IsActive)
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Unauthorized(new ErrorResponse("ログインしてください。"));
        }

        // 4. ログイン中のユーザーを返す
        return Ok(UserResponse.From(user));
    }
}
