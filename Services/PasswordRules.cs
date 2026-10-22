using System.Text.RegularExpressions;

namespace StaffSchedule.Services;

/// <summary>
/// パスワードの決まり（ユーザー登録とパスワード再設定で共通）。
/// 8文字以上・128文字以下で、英字と数字を両方含むこと。
/// </summary>
public static partial class PasswordRules
{
    public const int MinLength = 8;
    public const int MaxLength = 128;

    /// <summary>決まりを満たしていれば true</summary>
    public static bool IsValid(string password) =>
        password.Length >= MinLength && password.Length <= MaxLength
        && HasLetter().IsMatch(password) && HasDigit().IsMatch(password);

    /// <summary>
    /// パスワードと確認用パスワードをチェックし、エラーを errors に入れる。
    /// キーは画面の入力欄に対応（password / passwordConfirm）。
    /// </summary>
    public static void Validate(string password, string confirm, IDictionary<string, string> errors,
        string emptyMessage = "パスワードを入力してください。")
    {
        if (password.Length == 0) errors["password"] = emptyMessage;
        else if (!IsValid(password)) errors["password"] = "8文字以上で、英字と数字を両方含めてください。";

        if (confirm.Length == 0) errors["passwordConfirm"] = "確認のため、もう一度パスワードを入力してください。";
        else if (confirm != password) errors["passwordConfirm"] = "上のパスワードと一致しません。";
    }

    [GeneratedRegex("[A-Za-z]")] private static partial Regex HasLetter();
    [GeneratedRegex("[0-9]")] private static partial Regex HasDigit();
}
