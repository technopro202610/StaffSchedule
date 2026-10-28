using Npgsql;

namespace StaffSchedule.Data;

/// <summary>
/// PostgreSQL への接続を作る係。
/// 接続文字列は appsettings.json の ConnectionStrings:Default から読み込みます。
/// NpgsqlDataSource が接続の使い回し（コネクションプール）を管理します。
/// </summary>
public interface IDbConnectionFactory
{
    NpgsqlConnection Create();
}

public sealed class NpgsqlConnectionFactory : IDbConnectionFactory, IDisposable
{
    private readonly NpgsqlDataSource _dataSource;

    public NpgsqlConnectionFactory(IConfiguration configuration)
    {
        // 接続文字列を読み込む（なければ、わかりやすいエラーで止める）
        string connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException(
                "接続文字列 'Default' が appsettings.json にありません。ConnectionStrings:Default を設定してください。");

        // 接続の使い回し（コネクションプール）をする仕組みを作る
        _dataSource = NpgsqlDataSource.Create(connectionString);
    }

    // 呼び出し側で using を付けて使い、終わったら必ず閉じる
    public NpgsqlConnection Create() => _dataSource.CreateConnection();

    // アプリを終えるときに、接続をまとめて閉じる
    public void Dispose() => _dataSource.Dispose();
}
