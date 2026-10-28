using System.Net;
using System.Net.Mail;
using System.Text;

namespace StaffSchedule.Services;

/// <summary>
/// メールを送る係。appsettings.json の "Smtp:Host" が
///   ・設定されている → SMTP サーバーで本当に送る（SmtpEmailSender）
///   ・空               → 送らずに mails フォルダーへ .txt で保存する（FileEmailSender。研修・開発用）
/// どちらを使うかは Program.cs で決めます。
/// </summary>
public interface IEmailSender
{
    Task SendAsync(string to, string subject, string body);
}

/// <summary>SMTP の設定（appsettings.json の "Smtp"）</summary>
public sealed class SmtpOptions
{
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string User { get; set; } = "";
    public string Password { get; set; } = ""; // パスワードはユーザーシークレットなどに置き、Git に入れない
    public string From { get; set; } = "no-reply@technopro.com";
}

/// <summary>本番用：SMTP サーバーでメールを送る</summary>
public sealed class SmtpEmailSender : IEmailSender
{
    private readonly SmtpOptions _options;
    public SmtpEmailSender(SmtpOptions options) => _options = options;

    public async Task SendAsync(string to, string subject, string body)
    {
        // 1. メールを作る（本文・件名は UTF-8 で日本語が文字化けしないように）
        using var message = new MailMessage(_options.From, to, subject, body)
        {
            BodyEncoding = Encoding.UTF8,
            SubjectEncoding = Encoding.UTF8,
        };

        // 2. SMTP サーバーにつなぐ準備（ユーザー名があればログイン情報も付ける）
        using var client = new SmtpClient(_options.Host, _options.Port) { EnableSsl = _options.EnableSsl };
        if (_options.User.Length > 0)
        {
            client.Credentials = new NetworkCredential(_options.User, _options.Password);
        }

        // 3. 送る
        await client.SendMailAsync(message);
    }
}

/// <summary>
/// 研修・開発用：メールを送らず、プロジェクトの mails フォルダーに保存し、ログにも出す。
/// 保存されたファイルを開けば、届くはずだったメールとリンクを確認できる。
/// </summary>
public sealed class FileEmailSender : IEmailSender
{
    private readonly string _folder;
    private readonly ILogger<FileEmailSender> _logger;

    public FileEmailSender(IWebHostEnvironment env, ILogger<FileEmailSender> logger)
    {
        _folder = Path.Combine(env.ContentRootPath, "mails");
        _logger = logger;
    }

    public async Task SendAsync(string to, string subject, string body)
    {
        // 1. mails フォルダーがなければ作る
        Directory.CreateDirectory(_folder);

        // 2. ファイル名に使えない文字を「_」にして、「日時_あて先.txt」の名前を決める
        string safeTo = string.Concat(to.Select(c => char.IsLetterOrDigit(c) || c is '.' or '_' or '-' ? c : '_'));
        string path = Path.Combine(_folder, $"{DateTime.Now:yyyyMMdd-HHmmss}_{safeTo}.txt");

        // 3. ファイルに保存し、ログにも本文を出す（リンクをコピーして開ける）
        string text = $"To: {to}\nSubject: {subject}\n\n{body}\n";
        await File.WriteAllTextAsync(path, text, Encoding.UTF8);
        _logger.LogInformation("【開発用】メールは送らずに保存しました: {Path}\n{Body}", path, body);
    }
}
