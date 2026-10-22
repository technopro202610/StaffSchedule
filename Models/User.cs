namespace StaffSchedule.Models;

/// <summary>
/// users テーブルの1行を表すクラス。
/// 列名（user_id）はスネークケース、プロパティ名（UserId）はパスカルケースです。
/// </summary>
public sealed class User
{
    public int UserId { get; init; }
    public string Email { get; init; } = "";
    public string DisplayName { get; init; } = "";
    public string PasswordHash { get; init; } = "";
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? LastLoginAt { get; init; }
}
