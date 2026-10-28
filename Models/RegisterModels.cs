namespace StaffSchedule.Models;

// =========================================================
//  【No2 新規会員登録画面】⇔ API でやり取りするデータの形（JSON）
// =========================================================

/// <summary>新規会員登録画面から送られてくる内容</summary>
public sealed record RegisterRequest(string? Name, string? Email, string? Password, string? PasswordConfirm);

/// <summary>登録処理の結果。Errors が空なら成功。</summary>
public sealed record RegisterResult(User? User, IReadOnlyDictionary<string, string> Errors)
{
    public bool Succeeded => Errors.Count == 0 && User is not null;
}
