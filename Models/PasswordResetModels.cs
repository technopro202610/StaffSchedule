namespace StaffSchedule.Models;

// =========================================================
//  パスワード再設定で画面 ⇔ API がやり取りするデータの形（JSON）
// =========================================================

/// <summary>① 再設定の申請画面から送られてくる内容</summary>
public sealed record PasswordResetRequest(string? Email);

/// <summary>③ 新しいパスワードの設定画面から送られてくる内容</summary>
public sealed record PasswordResetConfirmRequest(string? Token, string? Password, string? PasswordConfirm);

/// <summary>トークンが使えるときに画面へ返す内容（画面に「○○さんの」と出すため）</summary>
public sealed record PasswordResetVerifyResponse(string Email, string Name);

/// <summary>再設定の結果</summary>
public enum PasswordResetStatus
{
    Succeeded,      // 変更できた
    InvalidInput,   // パスワードが決まりを満たしていない
    InvalidToken,   // リンクが期限切れ・使用済み・存在しない
}

public sealed record PasswordResetResult(
    PasswordResetStatus Status,
    IReadOnlyDictionary<string, string> Errors,
    string? Email = null);
