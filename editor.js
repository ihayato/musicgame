class SongsEditor {
    constructor() {
        this.songsData = { songs: [] };
        this.selectedSongIndex = null;
        this.hasUnsavedChanges = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadSongsData();
    }
    
    setupEventListeners() {
        // File upload
        const fileInput = document.getElementById('fileInput');
        const uploadBtn = document.getElementById('uploadBtn');
        
        uploadBtn.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadFromFile(file);
            }
        });
        
        // Header buttons
        document.getElementById('saveBtn').addEventListener('click', () => this.saveSongsData());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadJSON());
        document.getElementById('backToGameBtn').addEventListener('click', () => {
            if (this.hasUnsavedChanges) {
                if (confirm('保存されていない変更があります。保存せずにゲームに戻りますか？')) {
                    window.location.href = 'index.html';
                }
            } else {
                window.location.href = 'index.html';
            }
        });
        
        // Add song button
        document.getElementById('addSongBtn').addEventListener('click', () => this.addNewSong());
        
        // Copy JSON button
        document.getElementById('copyJsonBtn').addEventListener('click', () => this.copyJSON());
        
        // Modal close
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        
        // Warn before leaving if unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }
    
    async loadSongsData() {
        try {
            // Try to load songs.json automatically
            const response = await fetch('songs.json');
            if (response.ok) {
                const data = await response.json();
                
                if (data.songs && Array.isArray(data.songs)) {
                    this.songsData = data;
                    this.hasUnsavedChanges = false;
                    this.renderSongList();
                    this.updateJSONPreview();
                    this.showNotification('songs.jsonを自動読み込みしました', 'success');
                    return;
                }
            }
        } catch (error) {
            console.log('Auto-load failed, showing manual load instructions');
        }
        
        // Fallback: Show initial empty state or instructions
        this.showNotification('「JSONファイルを開く」ボタンからsongs.jsonを読み込んでください', 'info');
        
        // Create empty structure
        this.songsData = { songs: [] };
        this.renderSongList();
        this.updateJSONPreview();
    }
    
    async loadFromFile(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // Validate JSON structure
            if (!data.songs || !Array.isArray(data.songs)) {
                throw new Error('Invalid songs.json format');
            }
            
            this.songsData = data;
            this.hasUnsavedChanges = false;
            this.renderSongList();
            this.updateJSONPreview();
            
            this.showNotification(`${file.name}を読み込みました`, 'success');
        } catch (error) {
            console.error('Error loading file:', error);
            this.showNotification('ファイルの読み込みに失敗しました。正しいJSONファイルか確認してください。', 'error');
        }
    }
    
    saveSongsData() {
        // Note: Browsers cannot directly save to the file system
        // This will download the file instead
        this.downloadJSON();
        this.showNotification('JSONファイルがダウンロードされました。サーバーに手動でアップロードしてください。', 'info');
    }
    
    downloadJSON() {
        const dataStr = JSON.stringify(this.songsData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'songs.json';
        link.click();
        
        URL.revokeObjectURL(url);
        this.hasUnsavedChanges = false;
    }
    
    copyJSON() {
        const jsonText = JSON.stringify(this.songsData, null, 2);
        navigator.clipboard.writeText(jsonText).then(() => {
            this.showNotification('JSONをクリップボードにコピーしました', 'success');
        }).catch(err => {
            console.error('Copy failed:', err);
            this.showNotification('コピーに失敗しました', 'error');
        });
    }
    
    addNewSong() {
        const newSong = {
            id: `song_${Date.now()}`,
            title: '新規楽曲',
            displayName: '新規楽曲',
            artist: 'アーティスト名',
            artistDisplayName: 'アーティスト名',
            difficulty: 3,
            duration: 180,
            genre: 'Electronic',
            year: new Date().getFullYear(),
            description: '',
            audio: 'assets/audio/newSong.mp3',
            video: 'assets/video/newSong.mp4',
            backgroundVideo: 'assets/video/newSong.mp4',
            jacket: '',
            color: {
                primary: '#ff6b9d',
                secondary: '#a8e6cf',
                accent: '#ffd93d'
            },
            preview: {
                start: 30,
                duration: 15,
                videoStart: 25
            },
            charts: {
                easy: 'assets/chart/newSong_easy.json',
                normal: 'assets/chart/newSong_normal.json',
                hard: 'assets/chart/newSong_hard.json',
                extreme: 'assets/chart/newSong_extreme.json'
            },
            ui: {
                showBackgroundVideo: true,
                showPreviewOnHover: true,
                animationStyle: 'fade',
                cardSize: 'large'
            }
        };
        
        this.songsData.songs.push(newSong);
        this.hasUnsavedChanges = true;
        this.renderSongList();
        this.selectSong(this.songsData.songs.length - 1);
        this.updateJSONPreview();
        
        this.showNotification('新規楽曲を追加しました', 'success');
    }
    
    deleteSong(index) {
        if (confirm(`「${this.songsData.songs[index].title}」を削除してもよろしいですか？`)) {
            this.songsData.songs.splice(index, 1);
            this.hasUnsavedChanges = true;
            this.selectedSongIndex = null;
            this.renderSongList();
            this.renderSongDetail();
            this.updateJSONPreview();
            
            this.showNotification('楽曲を削除しました', 'success');
        }
    }
    
    renderSongList() {
        const songList = document.getElementById('songListEditor');
        songList.innerHTML = '';
        
        this.songsData.songs.forEach((song, index) => {
            const songItem = document.createElement('div');
            songItem.className = 'song-item-editor';
            if (index === this.selectedSongIndex) {
                songItem.classList.add('selected');
            }
            
            songItem.innerHTML = `
                <h3>${song.displayName || song.title}</h3>
                <div class="song-meta">${song.genre} • ${song.artist}</div>
            `;
            
            songItem.addEventListener('click', () => this.selectSong(index));
            songList.appendChild(songItem);
        });
    }
    
    selectSong(index) {
        this.selectedSongIndex = index;
        this.renderSongList();
        this.renderSongDetail();
    }
    
    renderSongDetail() {
        const detailForm = document.getElementById('songDetailForm');
        
        if (this.selectedSongIndex === null) {
            detailForm.innerHTML = `
                <div class="no-selection">
                    <p>左側のリストから楽曲を選択してください</p>
                </div>
            `;
            return;
        }
        
        const song = this.songsData.songs[this.selectedSongIndex];
        
        detailForm.innerHTML = `
            <!-- 基本情報 -->
            <div class="form-section">
                <h3>基本情報</h3>
                
                <div class="form-group">
                    <label>楽曲ID</label>
                    <input type="text" id="songId" value="${song.id}" />
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>楽曲タイトル</label>
                        <input type="text" id="title" value="${song.title}" />
                    </div>
                    <div class="form-group">
                        <label>表示名</label>
                        <input type="text" id="displayName" value="${song.displayName || ''}" />
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>アーティスト</label>
                        <input type="text" id="artist" value="${song.artist}" />
                    </div>
                    <div class="form-group">
                        <label>アーティスト表示名</label>
                        <input type="text" id="artistDisplayName" value="${song.artistDisplayName || ''}" />
                    </div>
                </div>
                
                <div class="form-group">
                    <label>説明</label>
                    <textarea id="description">${song.description || ''}</textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>ジャンル</label>
                        <input type="text" id="genre" value="${song.genre}" />
                    </div>
                    <div class="form-group">
                        <label>年</label>
                        <input type="number" id="year" value="${song.year}" />
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>難易度</label>
                        <div class="difficulty-stars" id="difficultyStars">
                            <span class="star" data-value="1">★</span>
                            <span class="star" data-value="2">★</span>
                            <span class="star" data-value="3">★</span>
                            <span class="star" data-value="4">★</span>
                            <span class="star" data-value="5">★</span>
                            <span class="difficulty-value">(<span id="difficultyValue">${song.difficulty || 3}</span>/5)</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>時間（秒）</label>
                        <input type="number" id="duration" value="${song.duration}" />
                    </div>
                </div>
            </div>
            
            <!-- ファイルパス -->
            <div class="form-section">
                <h3>ファイルパス</h3>
                
                <div class="form-group">
                    <label>音声ファイル</label>
                    <input type="text" id="audio" value="${song.audio}" />
                </div>
                
                <div class="form-group">
                    <label>動画ファイル</label>
                    <input type="text" id="video" value="${song.video}" />
                </div>
                
                <div class="form-group">
                    <label>背景動画</label>
                    <input type="text" id="backgroundVideo" value="${song.backgroundVideo || ''}" />
                </div>
                
                <div class="form-group">
                    <label>ジャケット画像</label>
                    <input type="text" id="jacket" value="${song.jacket || ''}" />
                </div>
            </div>
            
            <!-- 譜面ファイル -->
            <div class="form-section">
                <h3>譜面ファイル</h3>
                
                <div class="form-group">
                    <label>EASY</label>
                    <input type="text" id="chartEasy" value="${song.charts?.easy || ''}" />
                </div>
                
                <div class="form-group">
                    <label>NORMAL</label>
                    <input type="text" id="chartNormal" value="${song.charts?.normal || ''}" />
                </div>
                
                <div class="form-group">
                    <label>HARD</label>
                    <input type="text" id="chartHard" value="${song.charts?.hard || ''}" />
                </div>
                
                <div class="form-group">
                    <label>EXTREME</label>
                    <input type="text" id="chartExtreme" value="${song.charts?.extreme || ''}" />
                </div>
            </div>
            
            <!-- カラー設定 -->
            <div class="form-section">
                <h3>カラー設定</h3>
                
                <div class="color-group">
                    <div class="form-group">
                        <label>プライマリーカラー</label>
                        <div class="color-input-wrapper">
                            <input type="text" id="colorPrimary" value="${song.color?.primary || '#ff6b9d'}" />
                            <div class="color-preview" style="background: ${song.color?.primary || '#ff6b9d'}"></div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>セカンダリーカラー</label>
                        <div class="color-input-wrapper">
                            <input type="text" id="colorSecondary" value="${song.color?.secondary || '#a8e6cf'}" />
                            <div class="color-preview" style="background: ${song.color?.secondary || '#a8e6cf'}"></div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>アクセントカラー</label>
                        <div class="color-input-wrapper">
                            <input type="text" id="colorAccent" value="${song.color?.accent || '#ffd93d'}" />
                            <div class="color-preview" style="background: ${song.color?.accent || '#ffd93d'}"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- プレビュー設定 -->
            <div class="form-section">
                <h3>プレビュー設定</h3>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>プレビュー開始（秒）</label>
                        <input type="number" id="previewStart" value="${song.preview?.start || 30}" />
                    </div>
                    <div class="form-group">
                        <label>プレビュー時間（秒）</label>
                        <input type="number" id="previewDuration" value="${song.preview?.duration || 15}" />
                    </div>
                </div>
                
                <div class="form-group">
                    <label>動画プレビュー開始（秒）</label>
                    <input type="number" id="previewVideoStart" value="${song.preview?.videoStart || 25}" />
                </div>
            </div>
            
            <!-- アクション -->
            <div class="form-actions">
                <div class="auto-save-indicator">
                    <span class="status-icon">💾</span>
                    <span>変更は自動的に反映されます</span>
                </div>
                <button class="btn btn-danger" onclick="editor.deleteSong(${this.selectedSongIndex})">削除</button>
            </div>
        `;
        
        // Add input event listeners for real-time updates
        detailForm.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('input', () => {
                this.hasUnsavedChanges = true;
                this.updateSongFromForm(); // Real-time update
                this.updateJSONPreview(); // Update JSON preview immediately
            });
            
            // Color preview update
            if (input.id.startsWith('color')) {
                input.addEventListener('input', (e) => {
                    const preview = e.target.nextElementSibling;
                    if (preview && preview.classList.contains('color-preview')) {
                        preview.style.background = e.target.value;
                    }
                });
            }
        });
        
        // Difficulty stars event listeners
        const currentDifficulty = song.difficulty || 3;
        const stars = document.querySelectorAll('.star');
        const difficultyValue = document.getElementById('difficultyValue');
        
        // Set initial stars
        this.updateStarDisplay(stars, currentDifficulty);
        
        stars.forEach(star => {
            star.addEventListener('click', (e) => {
                const value = parseInt(e.target.dataset.value);
                this.updateStarDisplay(stars, value);
                difficultyValue.textContent = value;
                this.hasUnsavedChanges = true;
                this.updateSongFromForm(); // Real-time update
                this.updateJSONPreview(); // Update JSON preview immediately
            });
            
            star.addEventListener('mouseenter', (e) => {
                const value = parseInt(e.target.dataset.value);
                this.updateStarDisplay(stars, value);
            });
        });
        
        // Reset on mouse leave
        const starsContainer = document.getElementById('difficultyStars');
        starsContainer.addEventListener('mouseleave', () => {
            const currentValue = parseInt(difficultyValue.textContent);
            this.updateStarDisplay(stars, currentValue);
        });
    }
    
    updateStarDisplay(stars, value) {
        stars.forEach((star, index) => {
            if (index < value) {
                star.classList.add('filled');
            } else {
                star.classList.remove('filled');
            }
        });
    }
    
    updateSongFromForm() {
        if (this.selectedSongIndex === null) return;
        
        try {
        
        const song = this.songsData.songs[this.selectedSongIndex];
        
        // Update basic info
        song.id = document.getElementById('songId').value;
        song.title = document.getElementById('title').value;
        song.displayName = document.getElementById('displayName').value || song.title;
        song.artist = document.getElementById('artist').value;
        song.artistDisplayName = document.getElementById('artistDisplayName').value || song.artist;
        song.description = document.getElementById('description').value;
        song.genre = document.getElementById('genre').value;
        song.year = parseInt(document.getElementById('year').value);
        song.difficulty = parseInt(document.getElementById('difficultyValue').textContent);
        song.duration = parseInt(document.getElementById('duration').value);
        
        // Update file paths
        song.audio = document.getElementById('audio').value;
        song.video = document.getElementById('video').value;
        song.backgroundVideo = document.getElementById('backgroundVideo').value;
        song.jacket = document.getElementById('jacket').value;
        
        // Update charts
        song.charts = {
            easy: document.getElementById('chartEasy').value,
            normal: document.getElementById('chartNormal').value,
            hard: document.getElementById('chartHard').value,
            extreme: document.getElementById('chartExtreme').value
        };
        
        // Update colors
        song.color = {
            primary: document.getElementById('colorPrimary').value,
            secondary: document.getElementById('colorSecondary').value,
            accent: document.getElementById('colorAccent').value
        };
        
        // Update preview
        song.preview = {
            start: parseInt(document.getElementById('previewStart').value),
            duration: parseInt(document.getElementById('previewDuration').value),
            videoStart: parseInt(document.getElementById('previewVideoStart').value)
        };
        
        this.hasUnsavedChanges = true;
        this.renderSongList(); // Update song list to show changes
        
        } catch (error) {
            console.error('Error updating song from form:', error);
            // Silently fail for real-time updates to avoid spam
        }
    }
    
    updateJSONPreview() {
        const preview = document.getElementById('jsonPreview');
        preview.textContent = JSON.stringify(this.songsData, null, 2);
    }
    
    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 2rem;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            info: '#2196F3'
        };
        
        notification.style.background = colors[type] || colors.info;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    closeModal() {
        document.getElementById('modal').style.display = 'none';
    }
}

// Initialize editor
const editor = new SongsEditor();

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize editor when page loads
let editor;
document.addEventListener('DOMContentLoaded', () => {
    editor = new SongsEditor();
    window.editor = editor; // Make it globally accessible
});