using System.Text.RegularExpressions;
using StaffSchedule.Models;
using StaffSchedule.Repositories;

namespace StaffSchedule.Services;

/// <summary>
/// 【No2 新規会員登録画面】のルールを持つ係。
/// 画面側でも入力チェックをしていますが、画面のチェックは簡単に回避できるため、
/// サーバー側でも必ず同じチェックを行います。
/// </summary>
public sealed partial class RegisterService
{
    // 入力の長さの上限（users テーブルの列の長さと合わせる）
    private const int NameMaxLength = 50;
    private const int EmailMaxLength = 256;

    // 使う係：users テーブルを読み書きする係・パスワードをハッシュ化する係・ログを書く係
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _hasher;
    private readonly ILogger<RegisterService> _logger;

    public RegisterService(IUserRepository users, IPasswordHasher hasher, ILogger<RegisterService> logger)
    {
        _users = users;
        _hasher = hasher;
        _logger = logger;
    }

    // ---------------------------------------------------------
    //  ユーザー登録
    // ---------------------------------------------------------
    public async Task<RegisterResult> RegisterAsync(RegisterRequest request)
    {
        // 0. 入力をそろえる（名前の空白・メールアドレスの小文字）
        string name = NormalizeName(request.Name);
        string email = UserInput.NormalizeEmail(request.Email);
        string password = request.Password ?? "";
        string confirm = request.PasswordConfirm ?? "";

        // 1. 入力チェック（キーは画面の入力欄に対応）
        var errors = new Dictionary<string, string>();

        // 名前：空ではないか、長すぎないか
        if (name.Length == 0) errors["name"] = "名前を入力してください。";
        else if (name.Length > NameMaxLength) errors["name"] = $"名前は{NameMaxLength}文字以内で入力してください。";

        // メールアドレス：空ではないか、長すぎないか、形が正しいか
        if (email.Length == 0) errors["email"] = "メールアドレスを入力してください。";
        else if (email.Length > EmailMaxLength || !EmailPattern().IsMatch(email))
            errors["email"] = "メールアドレスの形式が正しくありません（例：yamada.taro@example.com）。";

        // パスワードの決まりは再設定と共通（PasswordRules）
        PasswordRules.Validate(password, confirm, errors);

        // 2. メールアドレスの重複チェック（形式が正しいときだけDBに問い合わせる）
        if (!errors.ContainsKey("email") && await _users.EmailExistsAsync(email))
        {
            errors["email"] = "このメールアドレスはすでに登録されています。ログイン画面からログインしてください。";
        }

        // エラーがあれば、ここで終わり（DB には登録しない）
        if (errors.Count > 0) return new RegisterResult(null, errors);

        // 3. パスワードをハッシュ化してDBに登録
        try
        {
            User user = await _users.InsertAsync(email, name, _hasher.Hash(password));
            _logger.LogInformation("ユーザーを登録しました。UserId={UserId}", user.UserId);
            return new RegisterResult(user, errors);
        }

        // 同時に同じメールアドレスで登録されたとき（DB の UNIQUE 制約で止まる）
        catch (DuplicateEmailException)
        {
            // 同時に同じメールアドレスで登録されたとき（UNIQUE 制約で弾かれる）
            errors["email"] = "このメールアドレスはすでに登録されています。ログイン画面からログインしてください。";
            return new RegisterResult(null, errors);
        }
    }

    // 全角スペースを半角にし、連続する空白を1つにまとめる（「山田　太郎」→「山田 太郎」）
    private static string NormalizeName(string? name) =>
        Whitespace().Replace((name ?? "").Replace('　', ' ').Trim(), " ");

    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$")] private static partial Regex EmailPattern();
    [GeneratedRegex(@"\s+")] private static partial Regex Whitespace();
}
