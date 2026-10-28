using StaffSchedule.Models;
using StaffSchedule.Repositories;

namespace StaffSchedule.Services;

/// <summary>
/// 【No1 ログイン画面】のルールを持つ係（ログインの照合・ログイン中のユーザーの確認）。
/// </summary>
public sealed class LoginService
{
    // 存在しないユーザーでログインしたときも、照合と同じだけ時間をかけるためのダミー
    // （応答時間の差から「そのIDは存在する」と推測されるのを防ぐ）
    private static readonly string DummyHash = new Pbkdf2PasswordHasher().Hash("dummy-password-0000");

    // 使う係：users テーブルを読み書きする係・パスワードを照合する係・ログを書く係
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _hasher;
    private readonly ILogger<LoginService> _logger;

    public LoginService(IUserRepository users, IPasswordHasher hasher, ILogger<LoginService> logger)
    {
        _users = users;
        _hasher = hasher;
        _logger = logger;
    }

    // ---------------------------------------------------------
    //  ログイン（成功したらユーザー、失敗したら null を返す）
    // ---------------------------------------------------------
    public async Task<User?> LoginAsync(LoginRequest request)
    {
        // 1. 入力をそろえる（メールアドレスは小文字に）。どちらかが空なら失敗
        string email = UserInput.NormalizeEmail(request.Email);
        string password = request.Password ?? "";
        if (email.Length == 0 || password.Length == 0) return null;

        // 2. メールアドレスでユーザーを探す
        User? user = await _users.FindByEmailAsync(email);

        // 3. 見つからないとき：照合と同じだけ時間をかけてから失敗にする
        //    （すぐ返すと、応答の速さで「このメールアドレスは登録されていない」とわかってしまう）
        if (user is null)
        {
            _hasher.Verify(password, DummyHash); // 時間をそろえるためだけに実行（結果は使わない）
            return null;
        }

        // 4. パスワードが違う・利用停止のときは失敗
        if (!_hasher.Verify(password, user.PasswordHash) || !user.IsActive)
        {
            // 失敗の理由（IDが違う・PWが違う・利用停止）は画面に出さず、ログにだけ残す
            _logger.LogWarning("ログインに失敗しました。UserId={UserId} IsActive={IsActive}", user.UserId, user.IsActive);
            return null;
        }

        // 5. 成功：最後にログインした日時を記録して、ユーザーを返す
        await _users.UpdateLastLoginAsync(user.UserId);
        return user;
    }

    // ---------------------------------------------------------
    //  ログイン中のユーザーを探す（Cookie に入っている利用者IDから）
    // ---------------------------------------------------------
    public Task<User?> FindByIdAsync(int userId) => _users.FindByIdAsync(userId);
}
