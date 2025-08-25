class App {
    constructor() {
        this.currentScreen = 'menu';
        this.currentStep = 'song'; // 'song' or 'difficulty'
        this.game = null;
        this.songs = [];
        this.selectedSong = null;
        this.selectedDifficulty = null;
        this.previewAudio = null;
        this.isPreviewPlaying = false;
        
        this.initializeApp();
    }
    
    async initializeApp() {
        await this.loadSongs();
        this.setupEventListeners();
        this.renderSongList();
        this.checkTestMode();
        
        // Initialize game engine
        console.log('Checking if initGame exists:', typeof initGame);
        if (typeof initGame === 'function') {
            console.log('Calling initGame...');
            initGame();
            this.game = game;
            console.log('Game initialized:', this.game);
        } else {
            console.error('initGame function not found!');
        }
        
        console.log('App initialized with', this.songs.length, 'songs');
    }
    
    async loadSongs() {
        try {
            const response = await fetch('songs.json');
            const data = await response.json();
            this.songs = data.songs;
        } catch (error) {
            console.error('Error loading songs:', error);
            // Fallback to empty array
            this.songs = [];
        }
    }
    
    setupEventListeners() {
        // Back to song selection
        document.getElementById('backToSongBtn').addEventListener('click', () => {
            this.showSongSelection();
        });
        
        // Preview button
        document.getElementById('previewBtn').addEventListener('click', () => {
            this.togglePreview();
        });
        
        // Start game button
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        // Difficulty selection
        document.querySelectorAll('.difficulty-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const difficulty = card.dataset.difficulty;
                this.selectDifficulty(difficulty);
            });
        });
        
        // Game controls
        document.getElementById('backToMenu').addEventListener('click', () => {
            console.log('Back to menu clicked');
            this.backToMenu();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.currentScreen === 'game') {
                    this.backToMenu();
                } else if (this.currentStep === 'difficulty') {
                    this.showSongSelection();
                    this.stopPreview();
                }
            }
        });
    }
    
    renderSongList() {
        const songList = document.getElementById('songList');
        songList.innerHTML = '';
        
        if (this.songs.length === 0) {
            songList.innerHTML = `
                <div class="no-songs">
                    <p>楽曲が見つかりません。</p>
                    <p>assets/audio、assets/video、assets/chartフォルダに楽曲ファイルを配置し、songs.jsonを設定してください。</p>
                </div>
            `;
            return;
        }
        
        this.songs.forEach(song => {
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            songItem.dataset.songId = song.id;
            
            // カスタムカラー適用
            if (song.color) {
                songItem.style.setProperty('--primary-color', song.color.primary);
                songItem.style.setProperty('--secondary-color', song.color.secondary);
                songItem.style.setProperty('--accent-color', song.color.accent);
            }
            
            // 背景動画要素
            let videoElement = '';
            if (song.ui?.showBackgroundVideo && song.backgroundVideo) {
                videoElement = `
                    <video class="song-bg-video" muted loop preload="metadata">
                        <source src="${song.backgroundVideo}" type="video/mp4">
                        <source src="${song.backgroundVideo}" type="video/mov">
                    </video>
                    <div class="song-overlay"></div>
                `;
            }
            
            songItem.innerHTML = `
                ${videoElement}
                <div class="song-content">
                    <div class="song-header">
                        <h3>${song.displayName || song.title}</h3>
                        <div class="song-meta">
                            <span class="genre">${song.genre || ''}</span>
                            <span class="year">${song.year || ''}</span>
                        </div>
                    </div>
                    <div class="artist">${song.artistDisplayName || song.artist}</div>
                    ${song.description ? `<div class="description">${song.description}</div>` : ''}
                    <div class="song-stats">
                        <div class="stat">
                            <span class="stat-label">BPM</span>
                            <span class="stat-value">${song.bpm}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">時間</span>
                            <span class="stat-value">${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}</span>
                        </div>
                    </div>
                </div>
            `;
            
            // イベントリスナー追加
            songItem.addEventListener('click', (e) => {
                this.selectSong(song, e);
            });
            
            // ホバー時のプレビュー再生
            if (song.ui?.showPreviewOnHover && song.backgroundVideo) {
                const video = songItem.querySelector('.song-bg-video');
                if (video) {
                    songItem.addEventListener('mouseenter', () => {
                        video.currentTime = song.preview?.videoStart || 0;
                        video.play().catch(e => console.log('Video autoplay blocked:', e));
                    });
                    
                    songItem.addEventListener('mouseleave', () => {
                        video.pause();
                    });
                }
            }
            
            songList.appendChild(songItem);
        });
    }
    
    selectSong(song, event) {
        this.selectedSong = song;
        this.selectedDifficulty = null; // Reset difficulty selection
        
        // 他の楽曲の選択状態をクリア
        document.querySelectorAll('.song-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // 選択された楽曲をハイライト
        if (event && event.currentTarget) {
            event.currentTarget.classList.add('selected');
        }
        
        this.showDifficultySelection();
    }
    
    showSongSelection() {
        this.currentStep = 'song';
        this.selectedDifficulty = null;
        this.stopPreview();
        
        // Hide difficulty selection, show song selection
        document.getElementById('songSelection').classList.add('active');
        document.getElementById('difficultySelection').classList.remove('active');
        
        // Clear selections
        document.querySelectorAll('.difficulty-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Update start game button
        document.getElementById('startGameBtn').disabled = true;
        
        console.log('Switched to song selection');
    }
    
    backToMenu() {
        console.log('Returning to main menu');
        
        // Stop game if playing
        if (this.game) {
            this.game.stop();
            console.log('Game stopped');
        }
        
        // Stop any preview audio
        this.stopPreview();
        
        // Reset selections
        this.selectedSong = null;
        this.selectedDifficulty = null;
        this.currentStep = 'song';
        
        // Clear UI selections
        document.querySelectorAll('.song-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelectorAll('.difficulty-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Reset difficulty selection UI
        document.getElementById('songSelection').classList.add('active');
        document.getElementById('difficultySelection').classList.remove('active');
        document.getElementById('startGameBtn').disabled = true;
        
        // Switch to menu screen
        this.showScreen('menu');
        
        console.log('Successfully returned to main menu');
    }
    
    showDifficultySelection() {
        if (!this.selectedSong) return;
        
        this.currentStep = 'difficulty';
        const song = this.selectedSong;
        
        // Update banner information
        document.getElementById('bannerSongTitle').textContent = song.displayName || song.title;
        document.getElementById('bannerSongArtist').textContent = song.artistDisplayName || song.artist;
        document.getElementById('bannerBPM').textContent = `BPM: ${song.bpm}`;
        document.getElementById('bannerDuration').textContent = `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}`;
        
        // Setup banner video
        const bannerVideo = document.getElementById('bannerVideo');
        if (song.backgroundVideo) {
            bannerVideo.src = song.backgroundVideo;
            bannerVideo.currentTime = song.preview?.videoStart || 0;
            bannerVideo.play().catch(e => console.log('Banner video autoplay blocked:', e));
        }
        
        // Apply custom colors
        const banner = document.getElementById('songBanner');
        if (song.color) {
            banner.style.setProperty('--primary-color', song.color.primary);
            banner.style.setProperty('--secondary-color', song.color.secondary);
            banner.style.setProperty('--accent-color', song.color.accent);
        }
        
        // Setup preview audio
        this.setupPreview();
        
        // Hide song selection, show difficulty selection
        document.getElementById('songSelection').classList.remove('active');
        document.getElementById('difficultySelection').classList.add('active');
        
        console.log('Switched to difficulty selection for:', song.title);
    }
    
    setupPreview() {
        this.previewAudio = document.getElementById('previewAudio');
        if (this.selectedSong && this.selectedSong.audio) {
            this.previewAudio.src = this.selectedSong.audio;
            if (this.selectedSong.preview) {
                this.previewAudio.currentTime = this.selectedSong.preview.start;
            }
        }
    }
    
    selectDifficulty(difficulty) {
        this.selectedDifficulty = difficulty;
        
        // Update UI
        document.querySelectorAll('.difficulty-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`[data-difficulty="${difficulty}"]`).classList.add('selected');
        
        // Enable start game button
        document.getElementById('startGameBtn').disabled = false;
        
        console.log('Selected difficulty:', difficulty);
    }
    
    togglePreview() {
        if (!this.previewAudio) return;
        
        const previewBtn = document.getElementById('previewBtn');
        
        if (this.isPreviewPlaying) {
            this.previewAudio.pause();
            this.isPreviewPlaying = false;
            previewBtn.textContent = 'プレビュー';
        } else {
            this.previewAudio.play();
            this.isPreviewPlaying = true;
            previewBtn.textContent = '停止';
            
            // Stop after preview duration
            if (this.selectedSong.preview && this.selectedSong.preview.duration) {
                setTimeout(() => {
                    if (this.isPreviewPlaying) {
                        this.stopPreview();
                    }
                }, this.selectedSong.preview.duration * 1000);
            }
        }
    }
    
    stopPreview() {
        if (this.previewAudio) {
            this.previewAudio.pause();
            this.previewAudio.currentTime = this.selectedSong.preview ? this.selectedSong.preview.start : 0;
        }
        this.isPreviewPlaying = false;
        document.getElementById('previewBtn').textContent = 'プレビュー';
    }
    
    async startGame() {
        console.log('startGame called');
        console.log('selectedSong:', this.selectedSong);
        console.log('selectedDifficulty:', this.selectedDifficulty);
        
        if (!this.selectedSong || !this.selectedDifficulty) {
            alert('楽曲と難易度を選択してください。');
            return;
        }
        
        // Initialize game if not already done
        if (!this.game) {
            console.log('Game not initialized, attempting to initialize...');
            if (typeof initGame === 'function') {
                console.log('Calling initGame function...');
                initGame();
                this.game = game;
                console.log('Game after init:', this.game);
            } else if (typeof RhythmGame === 'function') {
                console.log('Creating RhythmGame instance directly...');
                this.game = new RhythmGame();
                console.log('Game created directly:', this.game);
            } else {
                console.error('Neither initGame nor RhythmGame is available');
            }
        }
        
        if (!this.game) {
            console.error('Game engine not initialized');
            console.log('Available globals:', {
                initGame: typeof initGame,
                game: typeof game, 
                RhythmGame: typeof RhythmGame
            });
            alert('ゲームエンジンの初期化に失敗しました。コンソールでエラーを確認してください。');
            return;
        }
        
        console.log('Game engine ready:', this.game);
        
        this.stopPreview();
        
        try {
            console.log('Loading chart for difficulty:', this.selectedDifficulty);
            
            // Load chart data
            const chartPath = this.selectedSong.charts[this.selectedDifficulty];
            console.log('Chart path:', chartPath);
            
            const chartData = await this.loadChart(chartPath);
            console.log('Chart data loaded:', chartData);
            console.log('📊 Chart has', chartData.notes?.length || 0, 'notes');
            console.log('📊 First 5 notes from chart:', chartData.notes?.slice(0, 5));
            
            // Setup game audio and video
            const gameAudio = document.getElementById('gameAudio');
            const bgVideo = document.getElementById('bgVideo');
            
            gameAudio.src = this.selectedSong.audio;
            console.log('Audio src set to:', this.selectedSong.audio);
            
            if (this.selectedSong.video) {
                bgVideo.src = this.selectedSong.video;
                console.log('Video src set to:', this.selectedSong.video);
            }
            
            this.showScreen('game');
            
            // Start game after audio is loaded
            const startGameplay = () => {
                console.log('Audio loaded, starting gameplay');
                console.log('Game object:', this.game);
                console.log('Chart data:', chartData);
                
                if (this.game && chartData) {
                    console.log('Loading chart into game...');
                    this.game.loadChart(chartData);
                    
                    // More reliable audio loading check
                    const attemptStart = () => {
                        if (gameAudio.readyState >= 2) { // HAVE_CURRENT_DATA or better
                            console.log('Audio ready (readyState:', gameAudio.readyState, '), starting game immediately...');
                            this.game.start();
                            console.log('Game.start() called');
                        } else {
                            console.log('Audio not ready (readyState:', gameAudio.readyState, '), waiting...');
                            setTimeout(attemptStart, 100); // Check every 100ms
                        }
                    };
                    
                    // Start checking immediately
                    attemptStart();
                    
                } else {
                    console.error('Game or chart data missing:', { 
                        game: this.game, 
                        gameType: typeof this.game,
                        chartData: chartData,
                        chartType: typeof chartData
                    });
                    alert('ゲームまたは譜面データが見つかりません。コンソールを確認してください。');
                }
            };
            
            if (gameAudio.readyState >= 2) {
                // Audio already loaded
                startGameplay();
            } else {
                gameAudio.addEventListener('loadeddata', startGameplay, { once: true });
                gameAudio.addEventListener('error', (e) => {
                    console.error('Audio loading error:', e);
                    alert('音楽ファイルの読み込みに失敗しました。');
                });
            }
            
            gameAudio.load();
            
        } catch (error) {
            console.error('Error starting game:', error);
            alert('ゲームの開始に失敗しました: ' + error.message);
        }
    }
    
    async loadChart(chartPath) {
        try {
            const response = await fetch(chartPath);
            const chartData = await response.json();
            return chartData;
        } catch (error) {
            console.warn('Chart file not found:', chartPath, 'Generating simple chart...');
            // Generate simple chart as fallback
            return this.generateFallbackChart();
        }
    }
    
    generateFallbackChart() {
        const duration = this.selectedSong.duration || 180;
        const notes = [];
        const noteInterval = 60 / this.selectedSong.bpm; // Beat interval
        
        // Generate notes based on difficulty
        const difficultyConfig = {
            easy: { noteRatio: 0.3, chordChance: 0 },
            normal: { noteRatio: 0.6, chordChance: 0.1 },
            hard: { noteRatio: 0.8, chordChance: 0.25 },
            extreme: { noteRatio: 1.0, chordChance: 0.4 }
        };
        
        const config = difficultyConfig[this.selectedDifficulty] || difficultyConfig.normal;
        
        for (let time = 2; time < duration - 2; time += noteInterval) {
            if (Math.random() < config.noteRatio) {
                const isChord = Math.random() < config.chordChance;
                
                if (isChord) {
                    const chordSize = Math.floor(Math.random() * 3) + 2;
                    for (let i = 0; i < chordSize; i++) {
                        notes.push({
                            time: time,
                            lane: i,
                            isChord: true,
                            chordGroup: notes.length
                        });
                    }
                } else {
                    notes.push({
                        time: time,
                        lane: Math.floor(Math.random() * 6),
                        isChord: false,
                        chordGroup: null
                    });
                }
            }
        }
        
        return {
            title: this.selectedSong.title,
            difficulty: this.selectedDifficulty,
            notes: notes,
            metadata: {
                totalNotes: notes.length,
                generatedAt: new Date().toISOString(),
                type: 'fallback-generated'
            }
        };
    }
    
    checkTestMode() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('test') === 'true') {
            const testChart = localStorage.getItem('testChart');
            const testAudio = localStorage.getItem('testAudio');
            
            if (testChart && testAudio) {
                try {
                    const chartData = JSON.parse(testChart);
                    this.loadTestChart(chartData, testAudio);
                    
                    localStorage.removeItem('testChart');
                    localStorage.removeItem('testAudio');
                    
                    console.log('Test mode activated');
                } catch (error) {
                    console.error('Error loading test data:', error);
                }
            }
        }
    }
    
    loadTestChart(chartData, audioSrc) {
        const gameAudio = document.getElementById('gameAudio');
        gameAudio.src = audioSrc;
        gameAudio.load();
        
        this.showScreen('game');
        
        gameAudio.addEventListener('loadeddata', () => {
            if (this.game) {
                this.game.loadChart(chartData);
                setTimeout(() => {
                    this.game.start();
                }, 1000);
            }
        }, { once: true });
    }
    
    showScreen(screenName) {
        console.log('showScreen called with:', screenName);
        
        // Force hide all screens first
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
            screen.style.display = 'none'; // Force hide
        });
        
        const targetScreen = document.getElementById(screenName);
        if (targetScreen) {
            targetScreen.classList.add('active');
            targetScreen.style.display = 'block'; // Force show
            this.currentScreen = screenName;
            console.log('Successfully switched to:', screenName);
        } else {
            console.error('Target screen not found:', screenName);
            return;
        }
        
        // ゲーム画面の時のみoverflow制御
        if (screenName === 'game') {
            document.body.classList.add('game-active');
        } else {
            document.body.classList.remove('game-active');
        }
        
        // Double check that the game screen is visible
        if (screenName === 'game') {
            setTimeout(() => {
                const gameScreen = document.getElementById('game');
                console.log('Game screen final state:', {
                    display: getComputedStyle(gameScreen).display,
                    hasActive: gameScreen.classList.contains('active')
                });
            }, 50);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    console.log('Application started');
});

// Add CSS for no-songs message
const additionalStyles = `
.no-songs {
    text-align: center;
    padding: 40px;
    color: #ccc;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 15px;
    border: 2px dashed #555;
}

.no-songs p {
    margin-bottom: 10px;
    line-height: 1.5;
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);