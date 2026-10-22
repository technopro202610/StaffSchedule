using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StaffSchedule.Models;
using StaffSchedule.Services;

namespace StaffSchedule.Controllers;

/// <summary>
/// ログイン画面・ユーザー登録画面から呼ばれるAPI。
///   POST /api/auth/register … ユーザー登録
///   POST /api/auth/login    … ログイン（成功するとCookieを発行）
///   POST /api/auth/logout   … ログアウト（Cookieを削除）
///   GET  /api/auth/me       … ログイン中のユーザー（画面を開き直したときの確認用）
/// </summary>
[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private const string LoginFailedMessage = "IDまたはパスワードが違います。入力内容を確認してください。";

    private readonly AuthService _auth;

    public AuthController(AuthService auth) => _auth = auth;

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        RegisterResult result = await _auth.RegisterAsync(request);

        if (!result.Succeeded)
        {
            return BadRequest(new ErrorResponse("入力内容を確認してください。", result.Errors)); // 400
        }

        // 登録しただけではログインしない（画面はログイン画面に戻り、パスワードを入れてログインする）
        return StatusCode(StatusCodes.Status201Created, ToResponse(result.User!));               // 201
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _auth.LoginAsync(request);
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

        return Ok(ToResponse(user)); // 200
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent(); // 204
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out int userId))
        {
            return Unauthorized(new ErrorResponse("ログインしてください。"));
        }

        // Cookieが残っていても、DB側で削除・利用停止されていたらログアウト扱いにする
        var user = await _auth.FindByIdAsync(userId);
        if (user is null || !user.IsActive)
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Unauthorized(new ErrorResponse("ログインしてください。"));
        }

        return Ok(ToResponse(user));
    }

    private static UserResponse ToResponse(Models.User user) => new(user.UserId, user.DisplayName, user.Email);
}
