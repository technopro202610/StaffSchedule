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
        string email = UserInput.NormalizeEmail(request.Email);
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

    // ---------------------------------------------------------
    //  ログイン中のユーザーを探す（Cookie に入っている利用者IDから）
    // ---------------------------------------------------------
    public Task<User?> FindByIdAsync(int userId) => _users.FindByIdAsync(userId);
}
