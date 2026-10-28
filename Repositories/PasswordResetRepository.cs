using Npgsql;
using NpgsqlTypes;
using StaffSchedule.Data;
using StaffSchedule.Models;

namespace StaffSchedule.Repositories;

/// <summary>
/// password_reset_tokens テーブルを読み書きする係。
/// トークンそのものは扱わず、SHA-256 にした値（tokenHash）だけで探します。
/// </summary>
public interface IPasswordResetRepository
{
    /// <summary>新しいトークンを登録する（同じ人の古い未使用トークンは無効にする）</summary>
    Task CreateAsync(int userId, string tokenHash, int validMinutes);

    /// <summary>有効なトークン（未使用・期限内・利用中のユーザー）なら、その利用者を返す</summary>
    Task<User?> FindUserByValidTokenAsync(string tokenHash);

    /// <summary>
    /// トークンが有効なら、パスワードを書き換えてトークンを使用済みにする（1つのトランザクションで）。
    /// 変更できた利用者を返す。トークンが無効なら null。
    /// </summary>
    Task<User?> ResetPasswordAsync(string tokenHash, string newPasswordHash);
}

public sealed class PasswordResetRepository : IPasswordResetRepository
{
    // DB への接続を作る係
    private readonly IDbConnectionFactory _db;

    public PasswordResetRepository(IDbConnectionFactory db) => _db = db;

    public async Task CreateAsync(int userId, string tokenHash, int validMinutes)
    {
        await using NpgsqlConnection conn = _db.Create();
        await conn.OpenAsync();

        // トランザクション：下の2つの SQL を「全部成功」か「全部取り消し」にする
        await using NpgsqlTransaction tx = await conn.BeginTransactionAsync();

        // 古いリンクは使えなくする（最後に送ったメールのリンクだけが有効）
        const string expireOld = """
            UPDATE password_reset_tokens SET used_at = now()
            WHERE user_id = @user_id AND used_at IS NULL;
            """;
        await using (NpgsqlCommand cmd = new(expireOld, conn, tx))
        {
            cmd.Parameters.Add("user_id", NpgsqlDbType.Integer).Value = userId;
            await cmd.ExecuteNonQueryAsync();
        }

        // S07：新しいトークンを登録する（期限＝今から validMinutes 分）
        const string insert = """
            INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
            VALUES (@user_id, @token_hash, now() + make_interval(mins => @minutes));
            """;
        await using (NpgsqlCommand cmd = new(insert, conn, tx))
        {
            cmd.Parameters.Add("user_id", NpgsqlDbType.Integer).Value = userId;
            cmd.Parameters.Add("token_hash", NpgsqlDbType.Char).Value = tokenHash;
            cmd.Parameters.Add("minutes", NpgsqlDbType.Integer).Value = validMinutes;
            await cmd.ExecuteNonQueryAsync();
        }

        // ここまで成功したら確定する
        await tx.CommitAsync();
    }

    public async Task<User?> FindUserByValidTokenAsync(string tokenHash)
    {
        // S08：有効なトークン（未使用・期限内・利用中のユーザー）の利用者を探す
        const string sql = """
            SELECT u.user_id, u.email, u.display_name, u.password_hash, u.is_active, u.created_at, u.last_login_at
            FROM password_reset_tokens t
            JOIN users u ON u.user_id = t.user_id
            WHERE t.token_hash = @token_hash
              AND t.used_at IS NULL
              AND t.expires_at > now()
              AND u.is_active;
            """;

        await using NpgsqlConnection conn = _db.Create();
        await conn.OpenAsync();
        await using NpgsqlCommand cmd = new(sql, conn);
        cmd.Parameters.Add("token_hash", NpgsqlDbType.Char).Value = tokenHash;

        await using NpgsqlDataReader r = await cmd.ExecuteReaderAsync();
        return await r.ReadAsync() ? Map(r) : null;
    }

    public async Task<User?> ResetPasswordAsync(string tokenHash, string newPasswordHash)
    {
        await using NpgsqlConnection conn = _db.Create();
        await conn.OpenAsync();

        // トランザクション：「トークンを使用済みにする」と「パスワードを変える」を一緒に行う
        await using NpgsqlTransaction tx = await conn.BeginTransactionAsync();

        // 1. トークンを使用済みにする。有効なトークンのときだけ1行更新され、user_id が返る。
        //    （同時に2回押されても、2回目は used_at が入っているので更新されない）
        const string useToken = """
            UPDATE password_reset_tokens t SET used_at = now()
            FROM users u
            WHERE t.token_hash = @token_hash
              AND t.used_at IS NULL
              AND t.expires_at > now()
              AND u.user_id = t.user_id
              AND u.is_active
            RETURNING t.user_id;
            """;
        int userId;
        await using (NpgsqlCommand cmd = new(useToken, conn, tx))
        {
            cmd.Parameters.Add("token_hash", NpgsqlDbType.Char).Value = tokenHash;
            object? result = await cmd.ExecuteScalarAsync();
            if (result is not int id)
            {
                await tx.RollbackAsync();
                return null; // 期限切れ・使用済み・存在しない
            }
            userId = id;
        }

        // 2. パスワードを書き換え、変更後の利用者を受け取る
        const string updateUser = """
            UPDATE users SET password_hash = @password_hash, updated_at = now()
            WHERE user_id = @user_id
            RETURNING user_id, email, display_name, password_hash, is_active, created_at, last_login_at;
            """;
        User user;
        await using (NpgsqlCommand cmd = new(updateUser, conn, tx))
        {
            cmd.Parameters.Add("password_hash", NpgsqlDbType.Varchar).Value = newPasswordHash;
            cmd.Parameters.Add("user_id", NpgsqlDbType.Integer).Value = userId;
            await using NpgsqlDataReader r = await cmd.ExecuteReaderAsync();
            await r.ReadAsync();
            user = Map(r);
        }

        // 両方成功したら確定する
        await tx.CommitAsync();
        return user;
    }

    // 読み取った1行を User クラスに詰め替える
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
