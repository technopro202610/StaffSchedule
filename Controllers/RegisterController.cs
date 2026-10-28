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
    // 登録のルールを持つ係（Program.cs で登録したものが自動で渡される）
    private readonly RegisterService _register;

    public RegisterController(RegisterService register) => _register = register;

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        // 1. 入力チェックをして登録する（ルールは RegisterService）
        RegisterResult result = await _register.RegisterAsync(request);

        // 2. 入力に問題があれば 400 と、入力欄ごとのエラーを返す
        if (!result.Succeeded)
        {
            return BadRequest(new ErrorResponse("入力内容を確認してください。", result.Errors)); // 400
        }

        // 登録しただけではログインしない（画面はログイン画面に戻り、パスワードを入れてログインする）
        // 3. 成功したら 201（作成した）と、登録したユーザーを返す
        return StatusCode(StatusCodes.Status201Created, UserResponse.From(result.User!)); // 201
    }
}
