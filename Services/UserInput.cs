namespace StaffSchedule.Services;

/// <summary>
/// 入力値のそろえ方（全画面で共通）。
/// </summary>
public static class UserInput
{
    /// <summary>メールアドレスは前後の空白を除き、小文字にそろえて扱う</summary>
    public static string NormalizeEmail(string? email) => (email ?? "").Trim().ToLowerInvariant();
}
