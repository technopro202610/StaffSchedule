namespace StaffSchedule.Models;

// =========================================================
//  全画面で共通の、画面 ⇔ API でやり取りするデータの形（JSON）
//  JSONのキーは小文字始まり（name, email ...）で自動変換されます。
// =========================================================

/// <summary>画面に返すユーザー情報（パスワード関連は絶対に含めない）</summary>
public sealed record UserResponse(int UserId, string Name, string Email)
{
    /// <summary>users テーブルの1行から、画面に返す形を作る</summary>
    public static UserResponse From(User user) => new(user.UserId, user.DisplayName, user.Email);
}

/// <summary>
/// エラー時に返す内容。
/// Errors のキーは入力欄に対応します（name / email / password / passwordConfirm）。
/// </summary>
public sealed record ErrorResponse(string Message, IReadOnlyDictionary<string, string>? Errors = null);
