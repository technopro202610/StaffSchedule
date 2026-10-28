using System.Security.Cryptography;
using System.Text;
using StaffSchedule.Models;
using StaffSchedule.Repositories;

namespace StaffSchedule.Services;

/// <summary>
/// 【No9 パスワード再設定画面・No10 メール送信完了画面】のルールを持つ係。
///   ① 申請：メールアドレスを受け取り、登録済みならリンク付きのメールを送る
///   ② 確認：リンク（トークン）がまだ使えるかを調べる
///   ③ 変更：新しいパスワードに書き換え、リンクを使用済みにする
/// </summary>
public sealed class PasswordResetService
{
    public const int ValidMinutes = 30; // リンクの有効期限（分）

    private readonly IUserRepository _users;
    private readonly IPasswordResetRepository _resets;
    private readonly IPasswordHasher _hasher;
    private readonly IEmailSender _mail;
    private readonly ILogger<PasswordResetService> _logger;

    public PasswordResetService(IUserRepository users, IPasswordResetRepository resets, IPasswordHasher hasher,
        IEmailSender mail, ILogger<PasswordResetService> logger)
    {
        _users = users;
        _resets = resets;
        _hasher = hasher;
        _mail = mail;
        _logger = logger;
    }

    // ---------------------------------------------------------
    //  ① 申請
    //  登録されていないメールアドレスでも、画面には同じ「送信しました」を出す。
    //  （「このアドレスは登録済み」と他人に分からないようにするため）
    // ---------------------------------------------------------
    public async Task RequestAsync(string? emailInput, string baseUrl)
    {
        string email = UserInput.NormalizeEmail(emailInput);
        if (email.Length == 0) return;

        User? user = await _users.FindByEmailAsync(email);
        if (user is null || !user.IsActive)
        {
            _logger.LogInformation("再設定の申請：未登録または利用停止のアドレスのため、メールは送りません。");
            return;
        }

        // 推測できない長い文字列（32バイトの乱数 → 16進数64文字）を作る
        string token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        await _resets.CreateAsync(user.UserId, HashToken(token), ValidMinutes);

        string link = $"{baseUrl.TrimEnd('/')}/?reset={token}";
        string body = $"""
            {user.DisplayName} 様

            スタンバイ管理システムのパスワード再設定の申請を受け付けました。
            次のリンクを開き、新しいパスワードを設定してください。

            {link}

            ・このリンクの有効期限は {ValidMinutes} 分です。
            ・リンクは一度だけ使用できます。
            ・心当たりがない場合は、このメールを破棄してください。パスワードは変更されません。

            ※このメールは送信専用です。返信はできません。
            """;
        await _mail.SendAsync(user.Email, "【スタンバイ管理システム】パスワード再設定のご案内", body);
    }

    // ---------------------------------------------------------
    //  ② 確認：リンクを開いたときに、まだ使えるかを調べる
    // ---------------------------------------------------------
    public async Task<User?> VerifyAsync(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        return await _resets.FindUserByValidTokenAsync(HashToken(token));
    }

    // ---------------------------------------------------------
    //  ③ 変更
    // ---------------------------------------------------------
    public async Task<PasswordResetResult> ConfirmAsync(PasswordResetConfirmRequest request)
    {
        var errors = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(request.Token))
        {
            return new PasswordResetResult(PasswordResetStatus.InvalidToken, errors);
        }

        PasswordRules.Validate(request.Password ?? "", request.PasswordConfirm ?? "", errors,
            emptyMessage: "新しいパスワードを入力してください。");
        if (errors.Count > 0)
        {
            return new PasswordResetResult(PasswordResetStatus.InvalidInput, errors);
        }

        User? user = await _resets.ResetPasswordAsync(HashToken(request.Token), _hasher.Hash(request.Password!));
        if (user is null)
        {
            return new PasswordResetResult(PasswordResetStatus.InvalidToken, errors);
        }

        _logger.LogInformation("パスワードを再設定しました。UserId={UserId}", user.UserId);
        return new PasswordResetResult(PasswordResetStatus.Succeeded, errors, user.Email);
    }

    // DB にはトークンそのものではなく、SHA-256 にした値だけを保存・検索する
    private static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token.Trim()))).ToLowerInvariant();
}
