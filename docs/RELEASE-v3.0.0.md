# v3.0.0 リリース手順（モバイル新ビルド提出）

このリリースは `expo-speech-recognition`（マイク／音声認識のネイティブモジュール）を含むため、
2.33.0 ランタイムへの OTA では配信できません。**新しいネイティブビルドの作成と提出が必須**です。

`runtimeVersion: { policy: "appVersion" }` のため、`app.json` の `version` が 3.0.0 になっている
今ビルドすれば自動的に新ランタイムになります。

---

## 0. 事前チェック（確認済み）

- `app.json` — `version: "3.0.0"`、`runtimeVersion: { policy: "appVersion" }`、
  `plugins` に `expo-speech-recognition`（日本語permission文言）あり
- `ios.bundleIdentifier` / `android.package` — `app.replit.hskhsk`（変更なし）
- `eas.json` — `submit.production.ios.ascAppId: "6758777391"`
- EAS CLI — `chinhiroshi` で `EXPO_TOKEN` 認証済み

### 不足しているもの

- [ ] `google-play-service-account.json` がリポジトリルートに無い
  → Play Console で発行したサービスアカウントJSONをここに配置するか、
     `eas.json` の `serviceAccountKeyPath` を実際のパスに書き換える必要があります。

---

## 1. EAS production ビルド作成

ローカルの開発機（Apple 認証のため Mac 推奨）で実行してください。

```bash
# 両プラットフォーム同時にキューに投入
npx eas build --platform all --profile production
```

- iOS 初回は Apple ID のサインインを求められます（2FA対応）。
- Android Keystore は EAS が保管しているものを再利用します。
- ビルド番号（`buildNumber` / `versionCode`）は `autoIncrement: true` により自動で繰り上がります。
- 完了まで 15〜30分。完了URLが表示されます。

ビルド成果物のログで以下を確認:
- `expo-speech-recognition` がネイティブリンクされている
- `runtimeVersion = 3.0.0`

---

## 2. iOS 提出（TestFlight / App Store Connect）

```bash
npx eas submit --platform ios --profile production --latest
```

- `ascAppId: 6758777391` 宛に最新ビルドが提出されます。
- 提出後、App Store Connect で:
  - 輸出コンプライアンス: `ITSAppUsesNonExemptEncryption: false` を確認
  - マイク（`NSMicrophoneUsageDescription`）・音声認識（`NSSpeechRecognitionUsageDescription`）の
    用途説明文（日本語：「発音評価のためマイクを使用します」「発音評価のため音声認識を使用します」）が
    審査者に表示されることを確認
  - レビュー提出

---

## 3. Android 提出（Google Play Console internal）

```bash
# 事前に google-play-service-account.json をリポジトリルートに配置
npx eas submit --platform android --profile production --latest
```

- `track: internal`, `releaseStatus: draft` で投入されます。
- Play Console 側で:
  - マイク権限（`RECORD_AUDIO`）の宣言・用途を確認
  - データセーフティ申告を更新（音声認識の取り扱いを記載）
  - 問題なければ production track へ昇格

---

## 4. 動作確認

TestFlight / Play internal testing でインストールし、以下を実機確認:

- 発音評価ボタンをタップ → マイク許可ダイアログ表示
- 音声認識が動作（transcript が表示される）
- 評価スコアが計算される（lengthMatch / targetMatch を含む新ロジック）
- スプリント音声／文字学習に「声に出して読みましょう」バナーが表示される

---

## 5. 以降の OTA 配信

新ビルド公開後は、JSのみの修正を v3.0.0 ランタイムに対して OTA 配信できます:

```bash
npx eas update --branch production --message "<変更内容>"
```

`useOTAUpdate.ts` が起動時に自動チェック、プロフィールの隠しメニュー（バージョン表示を5秒長押し）から
手動チェック・履歴確認が可能です。
