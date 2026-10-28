namespace StaffSchedule.Models;

// =========================================================
//  【No1 ログイン画面】⇔ API でやり取りするデータの形（JSON）
// =========================================================

/// <summary>ログイン画面から送られてくる内容</summary>
public sealed record LoginRequest(string? Email, string? Password);
