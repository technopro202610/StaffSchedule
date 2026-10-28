using Microsoft.AspNetCore.Mvc;
using StaffSchedule.Models;
using StaffSchedule.Services;

namespace StaffSchedule.Controllers;

/// <summary>
/// 【No9 パスワード再設定画面】から呼ばれるAPI（ログインしていなくても使える）。
/// ① の結果は【No10 メール送信完了画面】に表示する。画面側：wwwroot/screens/no09_reset.js
///   POST /api/auth/password-reset/request … ① 再設定のメールを送る
///   GET  /api/auth/password-reset/verify  … ② メールのリンクがまだ使えるか確かめる
///   POST /api/auth/password-reset/confirm … ③ 新しいパスワードに変える
/// </summary>
[ApiController]
[Route("api/auth/password-reset")]
public sealed class PasswordResetController : ControllerBase
{
    // リンクが使えないときのメッセージ
    private const string InvalidLinkMessage = "このリンクは有効期限が切れているか、すでに使用されています。";

    // パスワード再設定のルールを持つ係と、設定（appsettings.json）を読む係
    private readonly PasswordResetService _reset;
    private readonly IConfiguration _config;

    public PasswordResetController(PasswordResetService reset, IConfiguration config)
    {
        _reset = reset;
        _config = config;
    }

    [HttpPost("request")]
    public async Task<IActionResult> RequestReset([FromBody] PasswordResetRequest request)
    {
        // メールのリンクの先頭部分。本番では appsettings.json の "App:BaseUrl" に正式なURLを書く。
        // （書いていない研修環境では、今アクセスしているURLを使う）
        // 1. メールに入れるリンクの先頭部分を決める
        string baseUrl = _config["App:BaseUrl"] is { Length: > 0 } url
            ? url
            : $"{HttpContext.Request.Scheme}://{HttpContext.Request.Host}";

        // 2. 登録されていればメールを送る（ルールは PasswordResetService）
        await _reset.RequestAsync(request.Email, baseUrl);

        // 3. 登録の有無にかかわらず、いつも同じ応答を返す
        return Ok(new ErrorResponse("入力されたメールアドレスが登録されている場合、再設定用のリンクを送信しました。"));
    }

    [HttpGet("verify")]
    public async Task<IActionResult> Verify([FromQuery] string? token)
    {
        // リンクがまだ使えるか調べる。使えなければ 410、使えれば名前とメールアドレスを返す
        var user = await _reset.VerifyAsync(token);
        return user is null
            ? StatusCode(StatusCodes.Status410Gone, new ErrorResponse(InvalidLinkMessage))   // 410：もう使えない
            : Ok(new PasswordResetVerifyResponse(user.Email, user.DisplayName));
    }

    [HttpPost("confirm")]
    public async Task<IActionResult> Confirm([FromBody] PasswordResetConfirmRequest request)
    {
        // 新しいパスワードに変える
        PasswordResetResult result = await _reset.ConfirmAsync(request);

        // 結果に合わせて返す：成功＝200、入力の誤り＝400、リンクが使えない＝410
        return result.Status switch
        {
            PasswordResetStatus.Succeeded => Ok(new { email = result.Email }),
            PasswordResetStatus.InvalidInput => BadRequest(new ErrorResponse("入力内容を確認してください。", result.Errors)),
            _ => StatusCode(StatusCodes.Status410Gone, new ErrorResponse(InvalidLinkMessage)),
        };
    }
}
