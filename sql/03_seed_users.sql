/* =========================================================
   03_seed_users.sql
   研修用のダミーユーザー12名を登録します（画面のダミーデータと同じ人）。
   ・staff_schedule データベースに接続した状態で実行してください。
   ・パスワードは全員 demo1234 です。
   ・password_hash は C# の Pbkdf2PasswordHasher と同じ方式で作った値です。
     （同じパスワードでも、ソルトが違うのでハッシュ値は1人ずつ異なります）
   ・ON CONFLICT … DO NOTHING により、同じメールアドレスがいれば登録しません。
     （何度実行しても安全。ただし実行するたびに user_id の番号は進むため、
       あとで登録した人の番号が飛ぶことがあります。これは正常な動きです）
   ========================================================= */
INSERT INTO users (email, display_name, password_hash)
VALUES
    ('aoki.hanako@example.com', '青木 花子', 'PBKDF2-SHA256$100000$M+/LxA59mL6mLWK14NTacA==$47ouyjcwbv8741D67QhIgBPZUaCu/vjFTHyvaJqFLsI='),
    ('kato.misaki@example.com', '加藤 美咲', 'PBKDF2-SHA256$100000$Mh+GyjFj3eJz3lOE+kiodA==$pN5GxaIilJPMHYSgfH9vCUMYK4qn5BODtDlLU7qIOVg='),
    ('kobayashi.tatsuya@example.com', '小林 竜也', 'PBKDF2-SHA256$100000$t87v+oiN7O1N7B8dwAxZvw==$OXapLw/AfbmfwkmUiDkuYSZhKz6PJ4EhWbkUQ15LO9M='),
    ('sato.kenta@example.com', '佐藤 健太', 'PBKDF2-SHA256$100000$pWI2VkPmxu9y2Wl640Q+Hg==$2GTvlgP6xq14z/2QZPSbzZsdHoCGPAg/0dJ9sGWqm1U='),
    ('suzuki.ichiro@example.com', '鈴木 一郎', 'PBKDF2-SHA256$100000$a+iVvsLv5dytgJTMOWU7dw==$IfhjNXrHjMT2PNtjkotJA6ewSYgkeyogtNpdKfhtq50='),
    ('takahashi.kenta@example.com', '高橋 健太', 'PBKDF2-SHA256$100000$3zuIQQPEqoFSw6qaBaAG7w==$wJYHWD9ohy2YRnx5nUFVt9lmW8lt+h4i9v2T3+kNsF8='),
    ('tanaka.naoki@example.com', '田中 直樹', 'PBKDF2-SHA256$100000$VpMC+9j1l/5Ncb0u81+K+Q==$5Gyt8XFPS6u3YNGfh2KuVoPJXJIVYs+OTaWvab5iSnE='),
    ('nakamura.miho@example.com', '中村 みほ', 'PBKDF2-SHA256$100000$VREtaIBMqs4seUOYEOZZIw==$eopiOvjM7WFblsy6iD3nz+VyyDC9es2GRPUJAONm6KU='),
    ('yamada.taro@example.com', '山田 太郎', 'PBKDF2-SHA256$100000$zShJpWPIBoZ4TA4t3MZRJg==$LKvqwHYdCQP5Tg6vLB5X2AXCVYIKxJdwgsWpss+VRs0='),
    ('yamamoto.yuka@example.com', '山本 由香', 'PBKDF2-SHA256$100000$GT1+yr1JYWseFU4EaUmg0g==$a2TDOqknRm7zLFywpbNl8WaO82oZ/mbSLoBZDa/tRW0='),
    ('yoshida.sakura@example.com', '吉田 さくら', 'PBKDF2-SHA256$100000$c01Z2G59iQ9dh6W6HSboOw==$PSMUeOs0YRRVEqODsyE/R3ngCLjNza5aNt29cBJgpCg='),
    ('watanabe.ryo@example.com', '渡辺 涼', 'PBKDF2-SHA256$100000$QJ9+eVxovtMKJ99ZIIXdrQ==$YDGUaYznh6+DasxfX99Tdsmg0Ebx0y1j0hRV2vebqnk=')
ON CONFLICT (email) DO NOTHING;
