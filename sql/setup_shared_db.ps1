# =========================================================
#  setup_shared_db.ps1
#  講師（DB担当）のPCを「共有DB」にして、ダミーデータ入りの状態まで一気に作ります。
#
#  前提：このPCに PostgreSQL 18 が入っている（Command Line Tools も）
#  実行方法：
#    1. スタートボタンを右クリック →「ターミナル（管理者）」を開く
#    2. このファイルがあるフォルダ（StaffSchedule\sql）に移動する
#         cd C:\training\StaffSchedule\sql
#    3. 次の1行を実行する
#         powershell -ExecutionPolicy Bypass -File .\setup_shared_db.ps1
#    4. postgres（管理者）のパスワードを聞かれたら入力する
#
#  やること
#    ① Wi-Fi の IPアドレスを調べる
#    ② ネットワークを「プライベート」にする
#    ③ PostgreSQL が他のPCからの接続を受け付けるようにする（postgresql.conf / pg_hba.conf）
#    ④ PostgreSQL を再起動する
#    ⑤ ファイアウォールで 5432 番を開ける
#    ⑥ 電源接続中はスリープしないようにする
#    ⑦ 00_setup_all.sql を実行して、DB・テーブル・受講者ユーザー・ダミーデータを作る
#    ⑧ 受講者に配る接続情報を表示し、ファイルに保存する
#  何度実行しても大丈夫です（設定は重ねて書かれません。ダミーデータは入れ直されます）。
# =========================================================
$ErrorActionPreference = "Stop"
chcp 65001 > $null
[Console]::OutputEncoding = [Text.Encoding]::UTF8

function Step($msg) { Write-Host ""; Write-Host "▶ $msg" -ForegroundColor Cyan }

# --- 管理者で実行しているか ---
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { Write-Host "「ターミナル（管理者）」で実行してください。" -ForegroundColor Red; exit 1 }

# --- PostgreSQL の場所 ---
$pgRoot = "C:\Program Files\PostgreSQL\18"
if (-not (Test-Path "$pgRoot\bin\psql.exe")) {
    $found = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
    if ($found) { $pgRoot = $found.FullName } else { Write-Host "PostgreSQL が見つかりません。先にインストールしてください。" -ForegroundColor Red; exit 1 }
}
$psql = "$pgRoot\bin\psql.exe"
$dataDir = "$pgRoot\data"
Write-Host "PostgreSQL：$pgRoot"

# ① Wi-Fi の IPアドレス
Step "① Wi-Fi の IPアドレスを調べます"
$ip = Get-NetIPAddress -AddressFamily IPv4 |
      Where-Object { $_.InterfaceAlias -match "Wi-?Fi|ワイヤレス|Wireless" -and $_.IPAddress -notlike "169.254.*" } |
      Select-Object -First 1
if (-not $ip) {
    $ip = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1
}
if (-not $ip) { Write-Host "IPアドレスが見つかりません。Wi-Fi につながっているか確認してください。" -ForegroundColor Red; exit 1 }
$alias = $ip.InterfaceAlias; $addr = $ip.IPAddress; $prefix = $ip.PrefixLength
# ネットワークの範囲（例：192.168.10.0/24）
$bytes = ([Net.IPAddress]::Parse($addr)).GetAddressBytes()
$maskBits = ([long]4294967295 -shl (32 - $prefix)) -band [long]4294967295
$ipNum = ([long]$bytes[0] -shl 24) -bor ([long]$bytes[1] -shl 16) -bor ([long]$bytes[2] -shl 8) -bor [long]$bytes[3]
$netNum = $ipNum -band $maskBits
$network = "{0}.{1}.{2}.{3}/{4}" -f (($netNum -shr 24) -band 255), (($netNum -shr 16) -band 255), (($netNum -shr 8) -band 255), ($netNum -band 255), $prefix
Write-Host "IPアドレス：$addr（$alias）  つなげる範囲：$network"

# ② ネットワークをプライベートに
Step "② ネットワークを「プライベート」にします"
try { Set-NetConnectionProfile -InterfaceAlias $alias -NetworkCategory Private; Write-Host "OK" }
catch { Write-Host "変更できませんでした（会社の設定で固定されている可能性）。このまま続けます。" -ForegroundColor Yellow }

# ③ 接続を受け付ける設定
Step "③ 他のPCからの接続を受け付けるようにします"
$utf8 = New-Object System.Text.UTF8Encoding($false)   # BOM なし（PostgreSQL の設定ファイルは BOM 不可）
$conf = "$dataDir\postgresql.conf"; $hba = "$dataDir\pg_hba.conf"
foreach ($f in @($conf, $hba)) { if (-not (Test-Path "$f.bak_training")) { Copy-Item $f "$f.bak_training" } }   # 最初の1回だけ控えを取る
$c = [IO.File]::ReadAllText($conf)
if ($c -match "(?m)^\s*listen_addresses\s*=\s*'\*'") { Write-Host "postgresql.conf：設定済み" }
else {
    $c = [regex]::Replace($c, "(?m)^\s*#?\s*listen_addresses\s*=.*$", "listen_addresses = '*'    # 研修：他のPCから接続できるようにした")
    if ($c -notmatch "(?m)^listen_addresses = '\*'") { $c += "`r`nlisten_addresses = '*'`r`n" }
    [IO.File]::WriteAllText($conf, $c, $utf8); Write-Host "postgresql.conf：listen_addresses = '*'"
}
$line = "host    staff_schedule    all    $network    scram-sha-256"
$h = [IO.File]::ReadAllText($hba)
if ($h -match [regex]::Escape($network)) { Write-Host "pg_hba.conf：設定済み" }
else {
    $h = $h.TrimEnd() + "`r`n# 研修：同じWi-Fiの受講者PCから staff_schedule への接続を許可`r`n$line`r`n"
    [IO.File]::WriteAllText($hba, $h, $utf8); Write-Host "pg_hba.conf：$line"
}

# ④ 再起動
Step "④ PostgreSQL を再起動します"
$svc = Get-Service | Where-Object { $_.Name -like "postgresql*" } | Sort-Object Name -Descending | Select-Object -First 1
if (-not $svc) { Write-Host "PostgreSQL のサービスが見つかりません。" -ForegroundColor Red; exit 1 }
Restart-Service $svc.Name; Start-Sleep -Seconds 3; Write-Host "$($svc.Name)：$((Get-Service $svc.Name).Status)"

# ⑤ ファイアウォール
Step "⑤ ファイアウォールで 5432 番を開けます"
if (Get-NetFirewallRule -DisplayName "PostgreSQL 5432" -ErrorAction SilentlyContinue) { Write-Host "設定済み" }
else { New-NetFirewallRule -DisplayName "PostgreSQL 5432" -Direction Inbound -Protocol TCP -LocalPort 5432 -Profile Private -Action Allow | Out-Null; Write-Host "OK" }

# ⑥ スリープしない
Step "⑥ 電源接続中はスリープしないようにします"
powercfg /change standby-timeout-ac 0; Write-Host "OK"

# ⑦ DB・テーブル・ダミーデータ
Step "⑦ データベースを作り、ダミーデータを入れます"
$sec = Read-Host "postgres（管理者）のパスワード" -AsSecureString
$env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
$env:PGCLIENTENCODING = "UTF8"
& $psql -h localhost -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -f "$PSScriptRoot\00_setup_all.sql"
$code = $LASTEXITCODE
Remove-Item Env:\PGPASSWORD
if ($code -ne 0) { Write-Host "SQL の実行でエラーが出ました。上のメッセージを講師（Claude）に見せてください。" -ForegroundColor Red; exit 1 }

# ⑧ 接続情報
Step "⑧ 受講者に配る接続情報"
$users = @(@("襟川", "dev_erikawa", "QUKDQU_500"), @("山﨑", "dev_yamazaki", "A5mTVe_022"), @("吉原", "dev_yoshihara", "od0W72_232"))
$out = @("共有DBの接続情報（$(Get-Date -Format 'yyyy/MM/dd HH:mm') 作成）", "")
foreach ($u in $users) {
    $out += "■ $($u[0]) さん"
    $out += "  Host：$addr   Port：5432   Database：staff_schedule"
    $out += "  Username：$($u[1])   Password：$($u[2])"
    $out += "  システムのつなぎ先（StaffSchedule フォルダのターミナルで実行）："
    $out += "  dotnet user-secrets set `"ConnectionStrings:Default`" `"Host=$addr;Port=5432;Database=staff_schedule;Username=$($u[1]);Password=$($u[2])`""
    $out += ""
}
$card = "$PSScriptRoot\接続情報カード.txt"
[IO.File]::WriteAllLines($card, $out, (New-Object System.Text.UTF8Encoding($true)))
$out | ForEach-Object { Write-Host $_ }
Write-Host "保存しました：$card" -ForegroundColor Green
Write-Host "※ このPCの IPアドレスが変わると、みんなのつなぎ先も変わります。毎朝 ipconfig で確かめてください。" -ForegroundColor Yellow
