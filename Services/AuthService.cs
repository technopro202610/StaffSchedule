using System.Text.RegularExpressions;
using StaffSchedule.Models;
using StaffSchedule.Repositories;

namespace StaffSchedule.Services;

/// <summary>
/// ユーザー登録・ログインの「ルール」を持つ係。
/// 画面側でも入力チェックをしていますが、画面のチェックは簡単に回避できるため、
/// サーバー側でも必ず同じチェックを行います。
/// </summary>
public sealed partial class AuthService
{
    private const int NameMaxLength = 50;
    private const int EmailMaxLength = 256;

    // 存在しないユーザーでログインしたときも、照合と同じだけ時間をかけるためのダミー
    // （応答時間の差から「そのIDは存在する」と推測されるのを防ぐ）
    private static readonly string DummyHash = new Pbkdf2PasswordHasher().Hash("dummy-password-0000");

    private readonly IUserRepository _users;
    private readonly IPasswordHasher _hasher;
    private readonly ILogger<AuthService> _logger;

    public AuthService(IUserRepository users, IPasswordHasher hasher, ILogger<AuthService> logger)
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
        string name = NormalizeName(request.Name);
        string email = NormalizeEmail(request.Email);
        string password = request.Password ?? "";
        string confirm = request.PasswordConfirm ?? "";

        // 1. 入力チェック（キーは画面の入力欄に対応）
        var errors = new Dictionary<string, string>();

        if (name.Length == 0) errors["name"] = "名前を入力してください。";
        else if (name.Length > NameMaxLength) errors["name"] = $"名前は{NameMaxLength}文字以内で入力してください。";

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

        if (errors.Count > 0) return new RegisterResult(null, errors);

        // 3. パスワードをハッシュ化してDBに登録
        try
        {
            User user = await _users.InsertAsync(email, name, _hasher.Hash(password));
            _logger.LogInformation("ユーザーを登録しました。UserId={UserId}", user.UserId);
            return new RegisterResult(user, errors);
        }
        catch (DuplicateEmailException)
        {
            errors["email"] = "このメールアドレスはすでに登録されています。ログイン画面からログインしてください。";
            return new RegisterResult(null, errors);
        }
    }

    // ---------------------------------------------------------
    //  ログイン（成功したらユーザー、失敗したら null を返す）
    // ---------------------------------------------------------
    public async Task<User?> LoginAsync(LoginRequest request)
    {
        string email = NormalizeEmail(request.Email);
        string password = request.Password ?? "";
        if (email.Length == 0 || password.Length == 0) return null;

        User? user = await _users.FindByEmailAsync(email);

        if (user is null)
        {
            _hasher.Verify(password, DummyHash); // 時間をそろえるためだけに実行（結果は使わない）
            return null;
        }

        if (!_hasher.Verify(password, user.PasswordHash) || !user.IsActive)
        {
            // 失敗の理由（IDが違う・PWが違う・利用停止）は画面に出さず、ログにだけ残す
            _logger.LogWarning("ログインに失敗しました。UserId={UserId} IsActive={IsActive}", user.UserId, user.IsActive);
            return null;
        }

        await _users.UpdateLastLoginAsync(user.UserId);
        return user;
    }

    public Task<User?> FindByIdAsync(int userId) => _users.FindByIdAsync(userId);

    // メールアドレスは前後の空白を除き、小文字にそろえて扱う
    internal static string NormalizeEmail(string? email) => (email ?? "").Trim().ToLowerInvariant();

    // 全角スペースを半角にし、連続する空白を1つにまとめる（「山田　太郎」→「山田 太郎」）
    private static string NormalizeName(string? name) =>
        Whitespace().Replace((name ?? "").Replace('　', ' ').Trim(), " ");

    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$")] private static partial Regex EmailPattern();
    [GeneratedRegex(@"\s+")] private static partial Regex Whitespace();
}
