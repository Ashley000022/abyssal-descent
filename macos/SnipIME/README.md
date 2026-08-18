# SnipIME

**SnipIME**は、保存したテキストスニペットをmacOSの変換候補として呼び出せる、InputMethodKit製の独自IMEです。

> `;sig` と入力 → 候補を選択 → `Best,\nAsh` を挿入

外部通信やアクセシビリティ権限を使わず、データはMac内のJSONファイルに保存します。

## MVPでできること

| 機能 | 内容 |
|---|---|
| スニペット管理 | 名前、ショートコード、複数行テキストの追加・編集・削除 |
| IME候補表示 | `;`を起点にInputMethodKitの候補ウィンドウを表示 |
| 予測順位 | 一致度、使用回数、最終利用日時を組み合わせて最大8件を表示 |
| キーボード操作 | Space / Enter / Tabで確定、矢印で移動、Escapeでキャンセル |
| ローカル保存 | `~/Library/Application Support/SnipIME/snippets.json` |
| プライバシー | ネットワーク通信、キーロギング、アクセシビリティ権限なし |

保存ディレクトリは所有者のみアクセス可能な`0700`、JSONファイルは`0600`に固定します。データは通常のローカルバックアップやTime Machineの対象になり得ます。

## 必要環境

- macOS 13 Ventura以降
- Apple SiliconまたはIntel Mac
- Xcode Command Line Tools

```bash
xcode-select --install
```

## ビルドとインストール

リポジトリの`macos/SnipIME`で次を実行します。

```bash
Scripts/build.sh
Scripts/install.sh
```

インストール後、次の手順で入力方式を追加します。

1. **システム設定 → キーボード → テキスト入力 → 編集**を開く。
2. 左下の**＋**を押し、一覧から**SnipIME**を追加する。
3. メニューバーの入力メニューから**SnipIME**を選択する。
4. `;sig`と入力し、SpaceまたはEnterで確定する。

`Scripts/install.sh`は入力方式設定と管理アプリを自動で開きます。SnipIMEが一覧へすぐ現れない場合は、ログアウトして再ログインしてください。

## 使い方

### 候補を呼び出す

| 入力 | 動作 |
|---|---|
| `;` | よく使うスニペットを候補表示 |
| `;sig` | `sig`に近い候補へ絞り込み |
| Space / Enter / Tab | 選択中の候補を挿入 |
| ↑ / ↓ / ← / → | 候補を移動 |
| Escape | スニペット展開をやめ、`;query`をそのまま入力 |
| Backspace | クエリを1文字削除。空なら`;`も削除 |

### スニペットを管理する

`~/Applications/SnipIME Manager.app`を開きます。入力メニュー内の**スニペットを管理…**からも開けます。

ショートコードには先頭の`;`を含めません。たとえば`;meeting`で呼び出す場合は、`meeting`だけを保存します。

## 署名

標準ではローカル開発用のad hoc署名を使います。固定の自己署名証明書またはDeveloper IDを使う場合は、次のように指定します。

```bash
SIGN_IDENTITY="SnipIME Self-Signed" Scripts/build.sh
```

Macのキーチェーンアクセスで、同名の**自己署名ルート／コード署名**証明書を一度作成してください。正式配布にはApple Developer ID署名とnotarizationが別途必要です。

## テスト

```bash
Scripts/verify.sh
```

`CI/github-actions.yml`には、macOSランナー上で共有コア、IME、管理アプリ、app bundle、plist、署名を検証するGitHub Actionsテンプレートを同梱しています。リポジトリ管理者が`.github/workflows/snipime-macos.yml`へ配置すると有効になります。

## アンインストール

```bash
Scripts/uninstall.sh
```

スクリプトがキーボード設定を開くので、先にSnipIMEを入力ソース一覧から削除し、別の入力ソースへ切り替えてください。

スニペットデータは既定では残します。データも削除する場合は次を実行します。

```bash
DELETE_DATA=1 Scripts/uninstall.sh
```

## MVPの制約

SnipIMEはスニペット入力専用です。**通常の日本語かな漢字変換は行いません**。文章を書くときは普段の日本語IMEを使い、スニペットを挿入するときだけ入力メニューまたはmacOSの入力ソース切り替えショートカットでSnipIMEへ切り替えてください。

次の段階では、既存日本語IMEと行き来しやすい一時切り替え、プレースホルダー、日付変数、iCloud同期、インポート／エクスポートを追加できます。
