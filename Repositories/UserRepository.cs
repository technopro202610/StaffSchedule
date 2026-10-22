using Npgsql;
using NpgsqlTypes;
using StaffSchedule.Data;
using StaffSchedule.Models;

namespace StaffSchedule.Repositories;

/// <summary>同じメールアドレスがすでに登録されているときに投げる例外</summary>
public sealed class DuplicateEmailException : Exception
{
    public DuplicateEmailException(string email, Exception inner)
        : base($"メールアドレス {email} はすでに登録されています。", inner) { }
}

/// <summary>
/// users テーブルを読み書きする係。SQLはすべてここに集めます。
/// 値は必ず「パラメーター（@email など）」で渡し、SQL文に直接つなげません。
/// → SQLインジェクション対策
/// </summary>
public interface IUserRepository
{
    Task<User?> FindByEmailAsync(string email);
    Task<User?> FindByIdAsync(int userId);
    Task<bool> EmailExistsAsync(string email);
    Task<User> InsertAsync(string email, string displayName, string passwordHash);
    Task UpdateLastLoginAsync(int userId);
}

public sealed class UserRepository : IUserRepository
{
    private const string SelectColumns =
        "user_id, email, display_name, password_hash, is_active, created_at, last_login_at";

    private readonly IDbConnectionFactory _db;

    public UserRepository(IDbConnectionFactory db) => _db = db;

    public async Task<User?> FindByEmailAsync(string email)
    {
        const string sql = $"SELECT {SelectColumns} FROM users WHERE email = @email;";

        await using NpgsqlConnection conn = _db.Create();
        await conn.OpenAsync();
        await using NpgsqlCommand cmd = new(sql, conn);
        cmd.Parameters.Add("email", NpgsqlDbType.Varchar).Value = email;

        await using NpgsqlDataReader reader = await cmd.ExecuteReaderAsync();
        return await reader.ReadAsync() ? Map(reader) : null;
    }

    public async Task<User?> FindByIdAsync(int userId)
    {
        const string sql = $"SELECT {SelectColumns} FROM users WHERE user_id = @user_id;";

        await using NpgsqlConnection conn = _db.Create();
        await conn.OpenAsync();
        await using NpgsqlCommand cmd = new(sql, conn);
        cmd.Parameters.Add("user_id", NpgsqlDbType.Integer).Value = userId;

        await using NpgsqlDataReader reader = await cmd.ExecuteReaderAsync();
        return await reader.ReadAsync() ? Map(reader) : null;
    }

    public async Task<bool> EmailExistsAsync(string email)
    {
        const string sql = "SELECT EXISTS (SELECT 1 FROM users WHERE email = @email);";

        await using NpgsqlConnection conn = _db.Create();
        await conn.OpenAsync();
        await using NpgsqlCommand cmd = new(sql, conn);
        cmd.Parameters.Add("email", NpgsqlDbType.Varchar).Value = email;

        object? result = await cmd.ExecuteScalarAsync();
        return result is true;
    }

    public async Task<User> InsertAsync(string email, string displayName, string passwordHash)
    {
        // RETURNING で、登録した行（自動採番の user_id など）をそのまま受け取る
        const string sql = $"""
            INSERT INTO users (email, display_name, password_hash)
            VALUES (@email, @display_name, @password_hash)
            RETURNING {SelectColumns};
            """;

        await using NpgsqlConnection conn = _db.Create();
        await conn.OpenAsync();
        await using NpgsqlCommand cmd = new(sql, conn);
        cmd.Parameters.Add("email", NpgsqlDbType.Varchar).Value = email;
        cmd.Parameters.Add("display_name", NpgsqlDbType.Varchar).Value = displayName;
        cmd.Parameters.Add("password_hash", NpgsqlDbType.Varchar).Value = passwordHash;

        try
        {
            await using NpgsqlDataReader reader = await cmd.ExecuteReaderAsync();
            await reader.ReadAsync();
            return Map(reader);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation) // 23505
        {
            // 事前チェックの直後に、別の人が同じアドレスで登録した場合もここで止まる
            throw new DuplicateEmailException(email, ex);
        }
    }

    public async Task UpdateLastLoginAsync(int userId)
    {
        const string sql = "UPDATE users SET last_login_at = now() WHERE user_id = @user_id;";

        await using NpgsqlConnection conn = _db.Create();
        await conn.OpenAsync();
        await using NpgsqlCommand cmd = new(sql, conn);
        cmd.Parameters.Add("user_id", NpgsqlDbType.Integer).Value = userId;
        await cmd.ExecuteNonQueryAsync();
    }

    // 読み取った1行を User クラスに詰め替える（列名はスネークケース、プロパティはパスカルケース）
    private static User Map(NpgsqlDataReader r) => new()
    {
        UserId = r.GetInt32(r.GetOrdinal("user_id")),
        Email = r.GetString(r.GetOrdinal("email")),
        DisplayName = r.GetString(r.GetOrdinal("display_name")),
        PasswordHash = r.GetString(r.GetOrdinal("password_hash")),
        IsActive = r.GetBoolean(r.GetOrdinal("is_active")),
        CreatedAt = r.GetDateTime(r.GetOrdinal("created_at")),
        LastLoginAt = r.IsDBNull(r.GetOrdinal("last_login_at")) ? null : r.GetDateTime(r.GetOrdinal("last_login_at")),
    };
}
