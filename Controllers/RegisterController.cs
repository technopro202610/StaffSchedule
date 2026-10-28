using Microsoft.AspNetCore.Mvc;
using StaffSchedule.Models;
using StaffSchedule.Services;

namespace StaffSchedule.Controllers;

/// <summary>
/// 【No2 新規会員登録画面】から呼ばれるAPI。
///   POST /api/auth/register … ユーザー登録
/// 画面側：wwwroot/screens/no02_register.js
/// </summary>
[ApiController]
[Route("api/auth")]
public sealed class RegisterController : ControllerBase
{
    private readonly RegisterService _register;

    public RegisterController(RegisterService register) => _register = register;

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        RegisterResult result = await _register.RegisterAsync(request);

        if (!result.Succeeded)
        {
            return BadRequest(new ErrorResponse("入力内容を確認してください。", result.Errors)); // 400
        }

        // 登録しただけではログインしない（画面はログイン画面に戻り、パスワードを入れてログインする）
        return StatusCode(StatusCodes.Status201Created, UserResponse.From(result.User!)); // 201
    }
}
