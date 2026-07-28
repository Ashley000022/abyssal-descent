# Manus × ABYSSAL Product Commercial

Manusのプロンプト入力から、エージェントによる制作、成果物の受け渡し、完成した深海アプリの没入デモまでを**24秒**で描くRemotionプロジェクトです。添付アプリのCSS表現、実画面キャプチャ、GPT Image生成の深海生物、オリジナルBGMを統合しています。

## 仕様

| 項目 | 内容 |
|---|---|
| Composition ID | `ManusAbyssalCommercial` |
| 解像度 | 1920 × 1080 |
| フレームレート | 30 fps |
| 総尺 | 720 frames / 24 seconds |
| 映像コーデック | H.264 / yuv420p |
| 音声 | 24秒オリジナル・インストゥルメンタルBGM |

## タイムライン

| 時間 | シーン | 内容 |
|---|---|---|
| 0:00–0:04 | Prompt | Manusの入力欄へ深海アプリ制作プロンプトをタイプし送信 |
| 0:03.5–0:08 | Agent Build | エージェントがUI、テレメトリー、生成画像、モーションを順次構築 |
| 0:07.5–0:11.5 | Artifact Delivery | Manusの成果物カードからABYSSALアプリへシームレスに寄る |
| 0:11–0:22 | App Demo | 10,935mまで降下し、Twilight・Midnight・Hadal各ゾーンを横断 |
| 0:21–0:24 | End Card | 「From one prompt to a world you can explore.」とCTA |

## 起動とレンダリング

```bash
cd remotion
pnpm install
pnpm start
```

Remotion Studioから`ManusAbyssalCommercial`を選択して編集できます。最終品質のMP4は次のコマンドで再生成します。

```bash
pnpm run render
```

軽量確認用のプレビューは次のコマンドです。

```bash
pnpm run render:preview
```

エンドカードのカバー画像は次のコマンドで再生成します。

```bash
pnpm run still
```

## 主要ファイル

| パス | 役割 |
|---|---|
| `src/ManusAbyssalCommercial.tsx` | 全シーン、モーション、UI、テレメトリーの実装 |
| `src/Root.tsx` | Composition設定 |
| `public/abyssal/` | 実アプリのヒーロー画像と画面キャプチャ |
| `public/generated/` | GPT Image生成のクラゲ、ダイオウイカ、シンカイクサウオ |
| `public/audio/manus-abyssal-score.wav` | 24秒のオリジナルBGM |
| `out/manus-abyssal-commercial.mp4` | 完成動画 |
| `out/cover.png` | 納品用カバー画像 |

## 品質検証

TypeScript型検査、Remotionのフルレンダー、9カットのコンタクトシート目視確認、動画全編のマルチモーダル解析を実施しています。テレメトリーのFHD可読性、深海生物の表示、深海からエンドカードへのクロスフェード、BGM終端、黒フレーム、レイアウト崩れ、カクつきを確認し、納品可能と判定済みです。
