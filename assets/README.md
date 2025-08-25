# アセットフォルダについて

このフォルダには、ゲームで使用する楽曲やビデオなどのアセットファイルを配置します。

## フォルダ構成

```
assets/
├── audio/          # 音楽ファイル（.mp3）
├── video/          # 動画ファイル（.mp4）
├── chart/          # 譜面ファイル（.json）
├── images/         # ジャケット画像（.jpg, .png）
└── README.md       # このファイル
```

## ファイルの配置方法

### 1. 音楽ファイル（必須）
`assets/audio/` フォルダに楽曲のMP3ファイルを配置してください。

例: `assets/audio/demo_song_1.mp3`

### 2. 動画ファイル（オプション）
`assets/video/` フォルダに楽曲のミュージックビデオ（MP4）を配置してください。
ゲーム画面の背景として再生されます。

例: `assets/video/demo_song_1.mp4`

### 3. 譜面ファイル（オプション）
`assets/chart/` フォルダに各難易度の譜面JSONファイルを配置してください。
譜面ファイルがない場合は、BPMに基づいて自動生成されます。

例: 
- `assets/chart/demo_song_1_easy.json`
- `assets/chart/demo_song_1_normal.json`
- `assets/chart/demo_song_1_hard.json`
- `assets/chart/demo_song_1_extreme.json`

### 4. ジャケット画像（オプション）
`assets/images/` フォルダに楽曲のジャケット画像を配置してください。
楽曲選択画面で表示されます。

例: `assets/images/demo_song_1.jpg`

## songs.jsonの設定

ファイルを配置した後、プロジェクトルートの `songs.json` ファイルに楽曲情報を追加してください。

```json
{
  "songs": [
    {
      "id": "your_song_id",
      "title": "楽曲名",
      "artist": "アーティスト名",
      "bpm": 128,
      "duration": 180,
      "audio": "assets/audio/your_song.mp3",
      "video": "assets/video/your_song.mp4",
      "preview": {
        "start": 30,
        "duration": 15
      },
      "charts": {
        "easy": "assets/chart/your_song_easy.json",
        "normal": "assets/chart/your_song_normal.json",
        "hard": "assets/chart/your_song_hard.json",
        "extreme": "assets/chart/your_song_extreme.json"
      },
      "jacket": "assets/images/your_song.jpg"
    }
  ]
}
```

## 譜面ファイルの形式

譜面ファイルは以下の形式のJSONファイルです：

```json
{
  "title": "楽曲名",
  "difficulty": "normal",
  "notes": [
    {
      "time": 2.5,
      "lane": 0,
      "isChord": false,
      "chordGroup": null
    },
    {
      "time": 3.0,
      "lane": 2,
      "isChord": true,
      "chordGroup": 1
    }
  ],
  "metadata": {
    "totalNotes": 2,
    "chordNotes": 1,
    "generatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### ノーツの詳細
- `time`: ノーツが来るタイミング（秒）
- `lane`: レーン番号（0-5、A,S,D,G,H,Jの順）
- `isChord`: 同時押しかどうか
- `chordGroup`: 同時押しグループID（同じIDのノーツは同時押し）

## 推奨ファイル形式

### 音楽
- **形式**: MP3
- **ビットレート**: 128kbps 以上
- **サンプルレート**: 44.1kHz

### 動画
- **形式**: MP4 (H.264 + AAC)
- **解像度**: 1920x1080 以下
- **フレームレート**: 30fps
- **ビットレート**: 5Mbps 以下（軽量化のため）

### 画像
- **形式**: JPG または PNG
- **サイズ**: 500x500px 推奨（正方形）
- **ファイルサイズ**: 200KB 以下

## 注意事項

1. **著作権**: 使用する楽曲や動画は著作権を確認してください
2. **ファイルサイズ**: 大容量ファイルはパフォーマンスに影響する可能性があります
3. **ファイル名**: 日本語や特殊文字は避け、英数字とアンダースコアを使用してください
4. **パス**: songs.jsonのパスは assets/ から始まる相対パスで記述してください