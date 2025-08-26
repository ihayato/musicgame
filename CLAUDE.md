# 開発状況メモ

## サーバー起動方法
```bash
npm run dev
```

## アクセスURL
- **メインゲーム**: http://127.0.0.1:3000
- **譜面制作**: http://127.0.0.1:3000/chart-editor.html

## 確認済み動作状況 (2025-08-25 14:37)

✅ **サーバー正常起動確認済み**
- HTTPサーバーがポート3000で稼働中
- HTMLページが正常に配信されている
- アクセスログでブラウザからの接続確認済み

✅ **実装完了機能**
- "Crying Girl"楽曲の完全対応
  - MP3音楽ファイル配置済み
  - MOV動画ファイル配置済み  
  - 4つの難易度譜面ファイル作成済み
- 楽曲選択システム完成
- 難易度選択システム完成
- 譜面制作システム完成（リアルタイムプレビュー・編集機能付き）

✅ **UIテスト確認**
- メイン画面の楽曲カード表示
- 楽曲選択時のハイライト効果
- 難易度選択画面
- プレビュー再生機能

## 修正完了事項 (2025-08-25 14:45)

✅ **「ゲーム開始」問題修正**
- デバッグログ追加で問題箇所を特定
- ゲームエンジン初期化の確認処理追加
- エラーハンドリング強化

✅ **楽曲選択画面大幅改善**
- 背景動画プレビュー機能追加
- カスタムカラーテーマ対応
- 楽曲メタデータ表示（ジャンル、年、説明）
- ホバー時のビデオ再生

## songs.json設定方法（効率的な楽曲管理）

楽曲情報、MV表示、UI設定を全てJSONで管理：

```json
{
  "displayName": "表示用楽曲名",
  "artistDisplayName": "表示用アーティスト名", 
  "genre": "ジャンル",
  "year": 2024,
  "description": "楽曲説明文",
  "backgroundVideo": "assets/video/楽曲.mov",
  "color": {
    "primary": "#ff6b9d",    // メイン色
    "secondary": "#a8e6cf",  // セカンダリ色
    "accent": "#ffd93d"      // アクセント色
  },
  "ui": {
    "showBackgroundVideo": true,    // 背景動画表示
    "showPreviewOnHover": true,     // ホバー時プレビュー
    "animationStyle": "fade",       // アニメーション
    "cardSize": "large"             // カードサイズ
  }
}
```

## 緊急修正中: ノーツ流れない問題 (2025-08-25 15:20)

### 🚨 現在の問題
- **症状**: レイアウト修正後、ノーツが画面に表示されなくなった
- **原因調査中**: ノーツの位置計算、フィルタリング、描画処理を確認中

### 🔧 追加したデバッグ機能
- **ノーツ位置デバッグ**: 毎秒、可視ノーツ数と次のノーツ情報をログ出力
- **描画デバッグ**: 画面右上に実際に描画されたノーツ数を表示
- **フィルタリング修正**: 未ヒットノーツが誤って削除されないよう修正

### 🎮 テスト手順
1. ブラウザで http://127.0.0.1:3000 にアクセス
2. "Crying Girl"を選択
3. 任意の難易度を選択（Easy推奨：108ノーツ）
4. "ゲーム開始"をクリック
5. **開発者コンソールで以下を確認**:
   ```
   Canvas resized to: [幅] x [高さ]
   RhythmGame.start() called
   Notes generated: 108
   Sample notes: [最初の5ノーツデータ]
   Starting game loop...
   Time: [経過秒]s
   Notes: [残りノーツ数]
   ```

### 🖥️ 期待される画面表示
- 黒い半透明背景
- 6本の白い縦線（レーン境界）
- シアン色のジャッジメントライン（画面下部）
- 上から降ってくるカラフルなノーツ
- 左上にデバッグ情報「Time: XXXs」「Notes: XXX」
- 下部にキー表示（A,S,D,G,H,J）
- スコア・コンボ表示

### ❗ トラブルシューティング
もしゲームが表示されない場合:
1. コンソールエラーの確認
2. Canvas要素のCSS z-index確認  
3. audio/video読み込みエラーの確認

## ファイル構成
```
/assets/audio/cryinggirl.mp3     ✅ 配置済み
/assets/video/cryinggirl.mov     ✅ 配置済み  
/assets/chart/cryinggirl_*.json  ✅ 4難易度分作成済み
```

## 🚨 重要: 動画2倍速問題の対策 (2025-08-25 完全解決済み)

### 問題の概要
- **症状**: ゲーム画面の背景動画が2倍速で再生される
- **原因**: ブラウザの動画デコーダー破損、HTML属性の競合、Canvas描画との干渉

### ⚠️ 絶対に避けるべき設定
```html
<!-- ❌ 絶対にダメ: loop属性がデコーダー問題を引き起こす -->
<video id="bgVideo" muted loop></video>

<!-- ✅ 正しい設定 -->
<video id="bgVideo" muted tabindex="-1" playsinline disablePictureInPicture preload="auto"></video>
```

### 🛡️ 実装済み多層防御システム

#### 1. **動画要素完全再作成**
```javascript
// app.js: preloadVideo()メソッドで実装済み
recreateVideoElement(oldVideo) {
    // 古い要素を完全削除
    oldVideo.remove();
    
    // 新要素をゼロから作成
    const newVideo = document.createElement('video');
    newVideo.playbackRate = 1.0;        // 必須
    newVideo.defaultPlaybackRate = 1.0;  // 必須
    newVideo.loop = false;               // 必須
    
    // デコーダー干渉を防ぐCSS
    newVideo.style.cssText = `
        transform: none !important;
        animation: none !important;
        will-change: auto !important;
    `;
}
```

#### 2. **継続的速度監視**
```javascript
// app.js: startContinuousVideoMonitoring()で実装済み
setInterval(() => {
    if (video.playbackRate !== 1.0) {
        console.error('🚨 VIDEO SPEED ANOMALY DETECTED!');
        video.playbackRate = 1.0;        // 即座修正
        video.defaultPlaybackRate = 1.0; // 即座修正
    }
}, 200); // 200ms毎に監視
```

#### 3. **多段階チェックポイント**
- **初期化時**: `bgVideo.playbackRate = 1.0` 強制設定
- **プリロード時**: 要素再作成 + 速度再確認
- **開始時**: 3回の連続リセット + 速度確認
- **実行中**: 200ms毎の継続監視

#### 4. **ゲームエンジン同期**
```javascript
// 新しい動画要素をゲームエンジンに同期
if (this.game) {
    this.game.video = newBgVideo;
}
```

### 🔧 修正が必要な場合のチェックリスト

1. **HTML確認**: `<video>`タグに`loop`属性がないか
2. **CSS確認**: `transform`, `animation`等の干渉CSSがないか  
3. **JS確認**: `playbackRate`と`defaultPlaybackRate`が1.0に設定されているか
4. **監視確認**: 継続監視システムが動作しているか
5. **要素確認**: 動画要素が完全に再作成されているか

### 🚀 今後の開発指針

- **新しい動画機能追加時**: 必ず上記の5つのチェックポイントを確認
- **CSS修正時**: 動画要素に影響するプロパティは避ける
- **デバッグ時**: コンソールで`video.playbackRate`を常に確認
- **テスト時**: 必ず実際にゲームを開始して動画速度を確認

## 技術仕様
- フロントエンド: Vanilla JavaScript + Canvas 2D
- サーバー: http-server (Node.js)
- 音楽形式: MP3
- 動画形式: MOV (ブラウザ対応)
- 譜面形式: JSON
- キー配置: A,S,D,G,H,J (6キー)