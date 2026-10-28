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
    private const string LoginFailedMessage = "IDまたはパスワードが違います。入力内容を確認してください。";

    private readonly LoginService _login;

    public LoginController(LoginService login) => _login = login;

    // ---------------------------------------------------------
    //  ログイン
    // ---------------------------------------------------------
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _login.LoginAsync(request);
        if (user is null)
        {
            return Unauthorized(new ErrorResponse(LoginFailedMessage)); // 401
        }

        // Cookie に入れておく情報（クレーム）
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new(ClaimTypes.Name, user.DisplayName),
            new(ClaimTypes.Email, user.Email),
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = false }); // ブラウザを閉じたらログアウト

        return Ok(UserResponse.From(user)); // 200
    }

    // ---------------------------------------------------------
    //  ログアウト
    // ---------------------------------------------------------
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent(); // 204
    }

    // ---------------------------------------------------------
    //  ログイン中のユーザー（画面を開き直したとき、Cookie が有効か確かめる）
    // ---------------------------------------------------------
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out int userId))
        {
            return Unauthorized(new ErrorResponse("ログインしてください。"));
        }

        // Cookieが残っていても、DB側で削除・利用停止されていたらログアウト扱いにする
        var user = await _login.FindByIdAsync(userId);
        if (user is null || !user.IsActive)
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Unauthorized(new ErrorResponse("ログインしてください。"));
        }

        return Ok(UserResponse.From(user));
    }
}
