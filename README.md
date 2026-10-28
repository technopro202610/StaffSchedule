# スタッフ管理システム（研修用バックエンド）

プロトタイプの **ログイン画面** と **ユーザー登録画面** を、C#（ASP.NET Core Web API / .NET 10）と **PostgreSQL** につなげたものです。
画面のデザインはプロトタイプのままで、通信部分だけをAPI呼び出しに置き換えています。

## 1. 開発環境

| 種類 | 使うもの | 用途 |
|---|---|---|
| 開発ツール | VS Code ＋ C# Dev Kit（拡張機能） | C#のコードを書く・実行する・デバッグする（Windows・Mac 共通） |
| 実行環境 | .NET 10 SDK | C#のプログラムを動かす土台 |
| データベース | PostgreSQL 18（EDB の Windows インストーラー） | ユーザー情報を保存する |
| DB操作ツール | pgAdmin 4（無料。Windows・Mac 共通） | SQLの実行、テーブルの中身の確認 |
| ブラウザ | Edge または Chrome | 画面の確認（F12 の開発者ツールで通信も見られる） |

PostgreSQL のインストール時に聞かれる `postgres` ユーザーのパスワードは、研修では全員 `postgres` にそろえると、`appsettings.json` を変えずに済みます。
C# から PostgreSQL につなぐライブラリ（Npgsql）は、初回ビルド時に nuget.org から自動でダウンロードされます。

## 2. 全体の構成

```
ブラウザ（wwwroot/index.html ＋ 画面ごとの screens/*.html・*.js）
   │  fetch で JSON を送受信／ログイン状態は Cookie
   ▼
LoginController／RegisterController … APIの入口（画面ごと。URLとHTTPステータスを決める）
   ▼
LoginService／RegisterService …… 業務ルール（画面ごと。入力チェック・パスワード照合）
   ├─ Pbkdf2PasswordHasher … パスワードのハッシュ化・照合
   ▼
UserRepository ……… SQLを実行する（users テーブルを読み書き）
   ▼
PostgreSQL（staff_schedule データベース / users テーブル）
```

役割ごとにクラスを分けているので、「画面の入口」「ルール」「SQL」をそれぞれ別々に読めます。

## 3. フォルダ構成

| ファイル | 内容 |
|---|---|
| `sql/01_create_database.sql` | データベース作成（`postgres` DBに接続して実行） |
| `sql/02_create_tables.sql` | `users` テーブル作成（ここから先は `staff_schedule` DBに接続して実行） |
| `sql/03_seed_users.sql` | ダミーユーザー12名（パスワードは全員 `demo1234`） |
| `sql/04_check_queries.sql` | 研修中に中身を確認するクエリ集 |
| `sql/05_create_dev_roles.sql` | 共有DB用：受講者ごとのDBユーザー（DB担当が実行） |
| `sql/06_create_password_reset.sql` | パスワード再設定用のトークンを保存するテーブル |
| `sql/07_create_members_schedules.sql` | メンバー・予定・削除の記録・お知らせの既読のテーブル（詳細設計書「4.テーブル定義」） |
| `sql/08_seed_dummy_data.sql` | テスト用ダミーデータ（メンバー14名・予定・削除の記録）。何度でも入れ直せる |
| `sql/09_setup_local_all.sql` | 自分のPCにデータ入りのDBを作る（02・03・06・07・08 をまとめたもの）。pgAdmin の Query Tool で1回実行するだけ |
| `sql/00_setup_all.sql` | 01〜03・05〜08 をまとめたもの。psql で1回実行すると、データ入りの共有DBができる |
| `sql/setup_shared_db.ps1` | 講師（DB担当）PCを共有DBにする（Wi-Fiの設定・ファイアウォール・00 の実行・接続情報カードの作成）。管理者のターミナルで実行 |
| `Controllers/PasswordResetController.cs` | 【No9・No10】API：パスワード再設定（申請・リンク確認・変更） |
| `Services/PasswordResetService.cs` | 【No9・No10】再設定のルール（トークン作成・期限・メール文面） |
| `Services/PasswordRules.cs` | パスワードの決まり（登録と再設定で共通） |
| `Services/EmailSender.cs` | メール送信（SMTP／研修用は `mails` フォルダーに保存） |
| `Repositories/PasswordResetRepository.cs` | SQL（トークンの登録・確認・使用済み化とパスワード更新） |
| `Program.cs` | 起動設定（部品の登録、Cookie認証、画面の配信） |
| `Controllers/LoginController.cs` | 【No1】API：ログイン・ログアウト・ログイン中ユーザー |
| `Controllers/RegisterController.cs` | 【No2】API：ユーザー登録 |
| `Services/LoginService.cs` | 【No1】ログインの照合 |
| `Services/RegisterService.cs` | 【No2】登録の入力チェックと登録 |
| `Services/UserInput.cs` | 入力値のそろえ方（メールアドレスの小文字化など。共通） |
| `Models/LoginModels.cs`・`RegisterModels.cs`・`PasswordResetModels.cs` | 画面ごとの、画面 ⇔ API のデータの形 |
| `Models/CommonModels.cs` | 共通のデータの形（UserResponse・ErrorResponse） |
| `Services/PasswordHasher.cs` | パスワードのハッシュ化（PBKDF2） |
| `Repositories/UserRepository.cs` | SQL（SELECT / INSERT … RETURNING / UPDATE） |
| `Data/DbConnectionFactory.cs` | PostgreSQL への接続の作成 |
| `Models/` | テーブルの1行、画面とやり取りするデータの形 |
| `wwwroot/index.html` | 画面の外枠だけ。`js/app.js` を読み込む |
| `wwwroot/js/app.js` | 起動係。画面の HTML と JS を決まった順番で読み込み、最後にログイン状態を確認する。ファイルを増やしたらここの一覧に追加 |
| `wwwroot/js/common.js` | 全画面で使う共通部品（api・トースト・日付・保存データ・祝日など）。必ず最初に読み込む |
| `wwwroot/css/common.css`・`screens.css` | 共通の見た目／画面ごとの見た目 |
| `wwwroot/screens/no01_login.*` | No1 ログイン（.html＝画面、.js＝処理） |
| `wwwroot/screens/no02_register.*` | No2 新規会員登録 |
| `wwwroot/screens/no03_calendar.*` | No3 カレンダー（予定表・メンバー一覧・週の移動・クリックの振り分け） |
| `wwwroot/screens/no04_schedule.js` | No4 予定登録（ダイアログ） |
| `wwwroot/screens/no05_member_form.js` | No5 メンバー登録・編集（ダイアログ） |
| `wwwroot/screens/no06_07_13_confirm.js` | No6・No7 期間外／期間中へ変更の確認、No13 メンバー削除の確認 |
| `wwwroot/screens/no08_year.js` | No8 年間カレンダー |
| `wwwroot/screens/no09_reset.*` | No9 パスワード再設定（申請・新しいパスワード・リンク無効） |
| `wwwroot/screens/no10_mail_sent.*` | No10 メール送信完了 |
| `wwwroot/screens/no11_12_notice.js` | No11 お知らせ・No12 ログイン時のお知らせ |
| `wwwroot/screens/no14_autodelete.js` | No14 自動削除（削除日の計算・ログイン時の削除） |

## 4. 動かし方

1. **DBを作る**（DB担当が pgAdmin で実行）
   1. 「Databases」→「postgres」を右クリック →「Query Tool」で `01_create_database.sql` を開いて実行（F5）
   2. 「Databases」を Refresh し、「staff_schedule」を右クリック →「Query Tool」で `02` → `03` → `05` の順に実行
2. **接続先を合わせる**：`appsettings.json` の `ConnectionStrings:Default` を環境に合わせて変更します。

   ```
   Host=localhost;Port=5432;Database=staff_schedule;Username=postgres;Password=postgres
   ```

3. **起動する**：VS Code でこのフォルダを開き、ターミナルで次を実行して `http://localhost:5080` を開きます（保存すると画面に自動で反映されます）。デバッグするときは F5。

   ```
   dotnet watch
   ```

4. **試す**：`aoki.hanako@example.com` / `demo1234` でログイン、または「ユーザー登録」から新しく登録してログインします。
   そのあと `sql/04_check_queries.sql` を実行すると、登録した行やログイン日時の更新を確認できます。

## 4-2. 複数人で1つのDBを共有する（社内Wi-Fi）

DBは講師の「DB用PC」1台にまとめ、受講者は各自のPCの C# からネットワーク越しにつなぎます。

```
受講者のPC（C#）─┐
受講者のPC（C#）─┼─ 社内Wi-Fi ─ DB用PC（PostgreSQL / staff_schedule）
受講者のPC（C#）─┘
```

### 事前に確認すること（情報システム部門）
- **端末どうしの通信が許可されているか**：社内Wi-Fiは、同じWi-Fiにつないだ端末どうしの通信を止めていること（プライバシー分離・APアイソレーション）があります。止められていると、設定が正しくてもつながりません。
- **ポート 5432 番の通信を使ってよいか**

### DB用PCの設定（講師が1回だけ）
1. **IPアドレスを固定する**：Wi-Fiでは再接続のたびにIPアドレスが変わることがあります。情報システム部門にDHCPの予約（固定割り当て）を頼むか、PC名（例：`TRAINING-DB01`）でつなぐようにします。IPアドレスは `ipconfig` の「IPv4 アドレス」で確認できます。
2. **ネットワークを「プライベート」にする**：設定 → ネットワークとインターネット → Wi-Fi → 接続中のネットワーク → 「プライベート ネットワーク」。「パブリック」のままだと外からの接続が止められます。
3. **外からの接続を受け付ける**：`C:\Program Files\PostgreSQL\18\data\postgresql.conf`
   ```
   listen_addresses = '*'
   ```
4. **接続を許す範囲を決める**：同じフォルダの `pg_hba.conf` の末尾に追加（例：社内Wi-Fiが 192.168.10.x の場合）
   ```
   host  staff_schedule  all  192.168.10.0/24  scram-sha-256
   ```
5. **PostgreSQL を再起動**：Windows の「サービス」で `postgresql-x64-18` を再起動
6. **ファイアウォールを開ける**：管理者の PowerShell で
   ```
   New-NetFirewallRule -DisplayName "PostgreSQL 5432" -Direction Inbound -Protocol TCP -LocalPort 5432 -Profile Private -Action Allow
   ```
7. **スリープさせない**：研修中は電源設定で「スリープしない」にする
8. **受講者ユーザーを作る**：`sql/05_create_dev_roles.sql` を実行（受講者は読み書きのみ。テーブルの変更は講師だけ）

### 受講者側の設定
1. VS Code のターミナルで次を実行します（IP・ユーザー名・パスワードは自分のものに）。
   ```
   dotnet user-secrets set "ConnectionStrings:Default" "Host=192.168.10.20;Port=5432;Database=staff_schedule;Username=dev_tanaka;Password=配られたパスワード"
   ```
   ここに書いた内容は `appsettings.json` より優先され、PCの中だけに保存されます。**Git にはコミットされません。**
2. pgAdmin でも同じ Host・ユーザーで「Register → Server」し、つながることを確認します。

### 共有DBのルール
| ルール | 理由 |
|---|---|
| テーブルの作成・変更は講師だけ。変更は番号付きのSQLファイル（`06_…sql`）にして Git で共有する | 1人の変更で全員の C# が動かなくなるのを防ぐ |
| 自分が作るデータには目印を付ける（例：「田中_テスト1」） | 誰のデータかわかるようにする |
| 他の人のデータは変更・削除しない | 他の人のテストを壊さない |

### つながらないとき
| 症状 | 原因と対処 |
|---|---|
| `timeout` / 応答がない | Wi-Fiの端末間通信の制限、ファイアウォール、ネットワークが「パブリック」、DB用PCのスリープ、IPアドレスの変化 |
| `no pg_hba.conf entry` | `pg_hba.conf` の範囲に自分のIPアドレスが入っていない |
| `password authentication failed` | ユーザー名かパスワードの誤り |
| `permission denied` | 受講者ユーザーでテーブルを変更しようとした（正常な動き） |

## 5. API 仕様

| メソッド | URL | 送る内容 | 成功 | 失敗 |
|---|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password, passwordConfirm }` | **201** `{ userId, name, email }` | **400** `{ message, errors: { name?, email?, password?, passwordConfirm? } }` |
| POST | `/api/auth/login` | `{ email, password }` | **200** `{ userId, name, email }`＋Cookie発行 | **401** `{ message }` |
| POST | `/api/auth/logout` | なし | **204** Cookie削除 | － |
| GET | `/api/auth/me` | なし（Cookie） | **200** `{ userId, name, email }` | **401** 未ログイン |
| POST | `/api/auth/password-reset/request` | `{ email }` | **200**（登録の有無にかかわらず同じ応答） | － |
| GET | `/api/auth/password-reset/verify?token=…` | なし | **200** `{ email, name }` | **410** 期限切れ・使用済み |
| POST | `/api/auth/password-reset/confirm` | `{ token, password, passwordConfirm }` | **200** `{ email }` | **400** `{ errors }`、**410** 期限切れ・使用済み |

`errors` のキーは登録画面の入力欄に対応していて、画面はその欄の下にメッセージを出します。

## 6. 処理の流れ

### ユーザー登録
1. 画面で入力チェック（すぐに結果を見せるため）
2. `POST /api/auth/register`
3. `RegisterService` で **同じチェックをもう一度**（画面のチェックは回避できるため、サーバー側が本番）
4. `SELECT EXISTS (…)` でメールアドレスの重複を確認
5. パスワードをハッシュ化して `INSERT … RETURNING`（採番された `user_id` をそのまま受け取る）
6. 画面はログイン画面に戻り、メールアドレスが入った状態になる

### ログイン
1. `POST /api/auth/login`
2. `SELECT` でメールアドレスからユーザーを探す
3. 入力されたパスワードを、保存されているソルトで同じようにハッシュ化して比較
4. 一致したら `UPDATE` で `last_login_at` を更新し、Cookie を発行
5. 画面を開き直したときは `GET /api/auth/me` で、Cookie が有効ならログイン状態に戻る

### パスワード再設定
1. ログイン画面の「パスワードをお忘れの方はこちら」→ メールアドレスを入力して送信
2. 登録済みなら、推測できない長い文字列（トークン）を作り、DBには **SHA-256 にした値だけ** を保存（有効期限30分）
3. リンク `http://localhost:5080/?reset=トークン` をメールで送る
   - `appsettings.json` の `Smtp:Host` が空のとき（研修用）は送らず、プロジェクトの **`mails` フォルダー** に .txt で保存し、ターミナルにも表示する。そのファイルのリンクをブラウザで開けば続きを試せる
4. リンクを開くと、画面が `verify` でまだ使えるか確かめ、使えれば「新しいパスワードの設定」、使えなければ「リンクが無効です」を表示
5. 新しいパスワードを送ると、1つのトランザクションで「トークンを使用済み」と「パスワード変更」を行う（同じリンクは2回使えない）

**本番で設定すること**：`App:BaseUrl`（メールのリンクの先頭。例：`https://standby.technopro.com`）、`Smtp`（送信サーバー。パスワードはユーザーシークレットなどに置き、Git に入れない）

## 7. 研修で押さえたいポイント

| テーマ | どこで扱っているか |
|---|---|
| **SQLインジェクション対策**：値は必ずパラメーター（`@email`）で渡す | `UserRepository.cs` |
| **パスワードを平文で保存しない**：ソルト付きPBKDF2でハッシュ化 | `PasswordHasher.cs` |
| **画面とサーバーの両方で入力チェック** | `screens/no02_register.js` と `RegisterService.cs` |
| **重複はDBの制約でも防ぐ**：UNIQUE制約＋エラーコード `23505` の処理 | `02_create_tables.sql`、`UserRepository.cs` |
| **データの決まりをDBに持たせる**：メールアドレスは小文字（CHECK制約） | `02_create_tables.sql` |
| **ログイン失敗の理由を画面に出さない**：IDの存在を推測されないように | `LoginService.cs`、`LoginController.cs` |
| **HTTPステータスの使い分け**：201 / 400 / 401 / 204 | `LoginController.cs`・`RegisterController.cs` |
| **Cookieの安全設定**：HttpOnly、SameSite=Strict | `Program.cs` |
| **再設定リンクの安全な作り方**：乱数のトークン、DBにはハッシュだけ、期限30分、1回限り、登録の有無を答えない | `PasswordResetService.cs`、`PasswordResetRepository.cs` |

**演習のアイデア**
- 04 のクエリで `is_active = FALSE` にして、ログインできなくなることを確かめる
- ログイン失敗回数を数える列を追加し、5回失敗したらロックする
- 登録項目に「フリガナ」を追加する（テーブル → Models → RegisterService → 画面の順に手を入れる）

## 8. まだダミーのままの部分

- **スケジュール管理画面の予定データ（メンバー一覧のチェック状態を含む）**：プロトタイプのダミーデータのままで、DBにはまだ保存していません。
- **ログイン後の画面とのつなぎ方**：初期データの12名はメールアドレスで画面のダミーメンバーと結び付きます。新しく登録した人は予定が空の状態で表示されます。
- **次のステップ**：`schedules` テーブルと `/api/schedules` を作って、予定の読み書きをDBにつなげます。
