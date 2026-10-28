using System.Security.Cryptography;

namespace StaffSchedule.Services;

/// <summary>
/// パスワードをハッシュ化・照合する係。
/// パスワードそのもの（平文）はDBに保存せず、ここで作ったハッシュ値だけを保存します。
/// </summary>
public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string storedHash);
}

/// <summary>
/// PBKDF2（SHA-256・10万回）でハッシュ化します。.NET標準の機能だけで動きます。
/// 保存形式: PBKDF2-SHA256$繰り返し回数$ソルト(Base64)$ハッシュ(Base64)
/// </summary>
public sealed class Pbkdf2PasswordHasher : IPasswordHasher
{
    private const string Prefix = "PBKDF2-SHA256";
    private const int SaltSize = 16;        // ソルト: 16バイトの乱数（1人ずつ違う）
    private const int KeySize = 32;         // ハッシュの長さ: 32バイト
    private const int Iterations = 100_000; // 計算の繰り返し回数（多いほど総当たりに強い）
    private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;

    public string Hash(string password)
    {
        // 1. ソルト（1人ずつ違う乱数）を作る
        byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);

        // 2. パスワード＋ソルトを、10万回くり返してハッシュにする
        byte[] key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algorithm, KeySize);

        // 3. 「方式$回数$ソルト$ハッシュ」の1つの文字にして返す（これを DB に保存する）
        return string.Join('$', Prefix, Iterations, Convert.ToBase64String(salt), Convert.ToBase64String(key));
    }

    public bool Verify(string password, string storedHash)
    {
        // 1. 保存した文字を「$」で4つに分け、形が正しいか確かめる
        string[] parts = storedHash.Split('$');
        if (parts.Length != 4 || parts[0] != Prefix || !int.TryParse(parts[1], out int iterations))
        {
            return false;
        }

        // 2. ソルトと、保存したハッシュを取り出す（壊れていたら失敗）
        byte[] salt, expected;
        try
        {
            salt = Convert.FromBase64String(parts[2]);
            expected = Convert.FromBase64String(parts[3]);
        }
        catch (FormatException)
        {
            return false;
        }

        // 入力されたパスワードを「同じソルト・同じ回数」でハッシュ化して比べる
        byte[] actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, Algorithm, expected.Length);

        // 比較にかかる時間から中身を推測されないよう、一定時間で比較する
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}
