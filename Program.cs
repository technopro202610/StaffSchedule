using Microsoft.AspNetCore.Authentication.Cookies;
using StaffSchedule.Data;
using StaffSchedule.Repositories;
using StaffSchedule.Services;

// =========================================================
//  アプリの起動設定
//  画面(wwwroot/index.html) と API(/api/...) を同じサーバーから配信します。
//  同じサーバーなので、ブラウザのCookieでログイン状態を保てます。
// =========================================================
var builder = WebApplication.CreateBuilder(args);

// --- 使う部品（サービス）を登録する ---
builder.Services.AddControllers();                                          // APIのコントローラー
builder.Services.AddSingleton<IDbConnectionFactory, NpgsqlConnectionFactory>(); // DB(PostgreSQL)接続を作る係
builder.Services.AddScoped<IUserRepository, UserRepository>();              // Usersテーブルを読み書きする係
builder.Services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();      // パスワードをハッシュ化する係
builder.Services.AddScoped<AuthService>();                                  // 登録・ログインのルールを持つ係
builder.Services.AddScoped<IPasswordResetRepository, PasswordResetRepository>(); // 再設定トークンを読み書きする係
builder.Services.AddScoped<PasswordResetService>();                         // パスワード再設定のルールを持つ係

// --- メールを送る係 ---
// appsettings.json の "Smtp:Host" があれば本当に送る。空なら mails フォルダーに保存する（研修・開発用）。
var smtp = builder.Configuration.GetSection("Smtp").Get<SmtpOptions>() ?? new SmtpOptions();
if (smtp.Host.Length > 0)
    builder.Services.AddSingleton<IEmailSender>(new SmtpEmailSender(smtp));
else
    builder.Services.AddSingleton<IEmailSender, FileEmailSender>();

// --- ログイン状態を Cookie で保持する設定 ---
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "StaffSchedule.Auth";
        options.Cookie.HttpOnly = true;                  // JavaScriptからCookieを読めないようにする
        options.Cookie.SameSite = SameSiteMode.Strict;   // 他サイトからのなりすまし送信を防ぐ
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest; // 本番(HTTPS)では Always に
        options.ExpireTimeSpan = TimeSpan.FromHours(8);  // 8時間操作がなければログアウト
        options.SlidingExpiration = true;

        // APIなので、未ログイン時はログイン画面へリダイレクトせず 401 を返す
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

// --- リクエストを処理する順番 ---
app.UseDefaultFiles();   // http://localhost:5080/ で index.html を返す
app.UseStaticFiles();    // wwwroot フォルダの画面ファイルを配信
app.UseAuthentication(); // Cookie からログイン中のユーザーを読み取る
app.UseAuthorization();  // [Authorize] が付いたAPIをログイン必須にする
app.MapControllers();    // /api/... をコントローラーにつなぐ

app.Run();
