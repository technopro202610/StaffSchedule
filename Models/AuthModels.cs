namespace StaffSchedule.Models;

// =========================================================
//  画面 ⇔ API でやり取りするデータの形（JSON）
//  JSONのキーは小文字始まり（name, email ...）で自動変換されます。
// =========================================================

/// <summary>ユーザー登録画面から送られてくる内容</summary>
public sealed record RegisterRequest(string? Name, string? Email, string? Password, string? PasswordConfirm);

/// <summary>ログイン画面から送られてくる内容</summary>
public sealed record LoginRequest(string? Email, string? Password);

/// <summary>画面に返すユーザー情報（パスワード関連は絶対に含めない）</summary>
public sealed record UserResponse(int UserId, string Name, string Email);

/// <summary>
/// エラー時に返す内容。
/// Errors のキーは入力欄に対応します（name / email / password / passwordConfirm）。
/// </summary>
public sealed record ErrorResponse(string Message, IReadOnlyDictionary<string, string>? Errors = null);

/// <summary>登録処理の結果。Errors が空なら成功。</summary>
public sealed record RegisterResult(User? User, IReadOnlyDictionary<string, string> Errors)
{
    public bool Succeeded => Errors.Count == 0 && User is not null;
}
