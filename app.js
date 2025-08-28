class App {
    constructor() {
        // Prevent multiple instantiation
        if (window.appInstance) {
            console.warn('App already initialized, returning existing instance');
            return window.appInstance;
        }
        
        this.currentScreen = 'menu';
        this.currentStep = 'song'; // 'song' or 'difficulty'
        this.game = null;
        this.songs = [];
        this.selectedSong = null;
        this.selectedDifficulty = null;
        this.isPreviewPlaying = false;
        this.isTestMode = false;
        this.isInitialized = false;
        this.youtubePopupListenersSetup = false;
        
        window.appInstance = this;
        this.initializeApp();
    }
    
    async initializeApp() {
        if (this.isInitialized) {
            console.log('App already initialized, skipping...');
            return;
        }
        
        try {
            console.log('Starting app initialization...');
            
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
            
            this.isInitialized = true;
            console.log('App initialized successfully with', this.songs.length, 'songs');
        } catch (error) {
            console.error('App initialization failed:', error);
            throw error;
        }
    }
    
    async loadSongs() {
        try {
            console.log('Loading songs.json...');
            const response = await fetch('songs.json');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data || !Array.isArray(data.songs)) {
                throw new Error('Invalid songs.json format');
            }
            
            this.songs = data.songs;
            console.log('Songs loaded successfully:', this.songs.length, 'songs');
        } catch (error) {
            console.error('Error loading songs:', error);
            // Fallback to empty array
            this.songs = [];
            
            // Show user-friendly error message
            const songList = document.getElementById('songList');
            if (songList) {
                songList.innerHTML = `
                    <div class="error-message" style="color: #ff6b6b; padding: 20px; text-align: center;">
                        <h3>楽曲データの読み込みに失敗しました</h3>
                        <p>ページをリロードしてもう一度お試しください</p>
                        <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 10px;">リロード</button>
                    </div>
                `;
            }
        }
    }
    
    setupEventListeners() {
        // Back to song selection
        document.getElementById('backToSongBtn').addEventListener('click', () => {
            this.showSongSelection();
        });
        
        // Preview button
        
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
        
        // Clear screen controls
        document.getElementById('retryBtn').addEventListener('click', () => {
            console.log('Retry button clicked');
            this.retryGame();
        });
        
        document.getElementById('backToMenuFromClear').addEventListener('click', () => {
            console.log('Back to menu from clear clicked');
            this.backToMenu();
        });
        
        
        document.getElementById('backToEditorBtn').addEventListener('click', () => {
            console.log('Back to editor clicked');
            window.location.href = 'chart-editor.html';
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.currentScreen === 'game') {
                    this.backToMenu();
                } else if (this.currentStep === 'difficulty') {
                    this.showSongSelection();
                }
            }
        });
    }
    
    getDifficultyStars(difficulty) {
        const maxStars = 5;
        const filledStars = Math.min(Math.max(1, Math.round(difficulty)), maxStars);
        const emptyStars = maxStars - filledStars;
        
        let stars = '★'.repeat(filledStars);
        if (emptyStars > 0) {
            stars += '☆'.repeat(emptyStars);
        }
        
        return `<span class="difficulty-stars-display">${stars}</span>`;
    }
    
    categorizeByDifficulty() {
        const categories = [
            { id: 'featured', title: 'FEATURED', songs: [] },
            { id: 'easy', title: 'EASY ⭐', songs: [] },
            { id: 'normal', title: 'NORMAL ⭐⭐', songs: [] },
            { id: 'hard', title: 'HARD ⭐⭐⭐', songs: [] },
            { id: 'expert', title: 'EXPERT ⭐⭐⭐⭐+', songs: [] }
        ];
        
        this.songs.forEach(song => {
            const difficulty = song.difficulty || 3;
            
            // Featured楽曲はFEATUREDカテゴリにも追加
            if (song.featured) {
                categories[0].songs.push(song);
            }
            
            // すべての楽曲を難易度による分類に追加
            if (difficulty === 1) {
                categories[1].songs.push(song);
            } else if (difficulty === 2) {
                categories[2].songs.push(song);
            } else if (difficulty === 3) {
                categories[3].songs.push(song);
            } else if (difficulty >= 4) {
                categories[4].songs.push(song);
            }
        });
        
        return categories;
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
        
        // カテゴリ別に楽曲を分類
        const categories = this.categorizeByDifficulty();
        
        // カテゴリごとに表示
        categories.forEach(category => {
            if (category.songs.length > 0) {
                // カテゴリヘッダー
                const categoryHeader = document.createElement('div');
                categoryHeader.className = 'category-header';
                categoryHeader.innerHTML = `
                    <h2 class="category-title">${category.title}</h2>
                    <span class="category-count">${category.songs.length}曲</span>
                `;
                songList.appendChild(categoryHeader);
                
                // カテゴリコンテナ
                const categoryContainer = document.createElement('div');
                categoryContainer.className = 'category-container';
                categoryContainer.dataset.category = category.id;
                
                category.songs.forEach(song => {
            const songItem = document.createElement('div');
            // FEATUREDカテゴリ以外では、featuredでも通常のスタイル
            const shouldShowFeatured = song.featured && category.id === 'featured';
            songItem.className = shouldShowFeatured ? 'song-item featured' : 'song-item';
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
                ${shouldShowFeatured ? '<div class="featured-badge">FEATURED</div>' : ''}
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
                            <span class="stat-label">時間</span>
                            <span class="stat-value duration-loading">読み込み中...</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">難易度</span>
                            <span class="stat-value difficulty-stars">${this.getDifficultyStars(song.difficulty || 3)}</span>
                        </div>
                    </div>
                </div>
            `;
            
            // イベントリスナー追加
            songItem.addEventListener('click', (e) => {
                this.selectSong(song, e);
            });
            
            // ホバー時のプレビュー再生 - 改善版
            if (song.ui?.showPreviewOnHover && song.backgroundVideo) {
                const video = songItem.querySelector('.song-bg-video');
                if (video) {
                    let isPlaying = false;
                    let playPromise = null;
                    
                    songItem.addEventListener('mouseenter', async () => {
                        if (isPlaying) return;
                        
                        try {
                            // 他の動画を停止
                            document.querySelectorAll('.song-bg-video').forEach(v => {
                                if (v !== video && !v.paused) {
                                    v.pause();
                                }
                            });
                            
                            video.currentTime = song.preview?.videoStart || 0;
                            playPromise = video.play();
                            await playPromise;
                            isPlaying = true;
                            console.log('Preview video started successfully');
                        } catch (e) {
                            console.log('Video autoplay blocked:', e.name, e.message);
                            isPlaying = false;
                            playPromise = null;
                        }
                    });
                    
                    songItem.addEventListener('mouseleave', async () => {
                        if (playPromise) {
                            try {
                                await playPromise;
                            } catch (e) {
                                // Ignore play promise rejection
                            }
                        }
                        
                        if (!video.paused) {
                            video.pause();
                        }
                        isPlaying = false;
                        playPromise = null;
                    });
                }
            }
            
            categoryContainer.appendChild(songItem);
            
            // 実際のMP3ファイルから時間を取得
            this.loadActualDuration(song, songItem);
                });
                
                songList.appendChild(categoryContainer);
            }
        });
    }
    
    async loadActualDuration(song, songItem) {
        try {
            const audio = new Audio(song.audio);
            
            // プリロードしてメタデータを取得
            audio.preload = 'metadata';
            
            const loadPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout loading audio metadata'));
                }, 15000); // 15秒でタイムアウト（大きなファイルに対応）
                
                audio.addEventListener('loadedmetadata', () => {
                    clearTimeout(timeout);
                    resolve();
                }, { once: true });
                
                audio.addEventListener('error', () => {
                    clearTimeout(timeout);
                    reject(new Error('Error loading audio file'));
                }, { once: true });
                
                // 一部のブラウザでは canplaythrough イベントも必要
                audio.addEventListener('canplaythrough', () => {
                    clearTimeout(timeout);
                    resolve();
                }, { once: true });
            });
            
            // メタデータの読み込みを開始
            audio.load();
            
            // メタデータが読み込まれるまで待機
            await loadPromise;
            
            // 実際の時間を取得して表示
            const duration = Math.floor(audio.duration);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            
            const durationElement = songItem.querySelector('.stat-value');
            if (durationElement) {
                durationElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                durationElement.classList.remove('duration-loading');
            }
            
            // 楽曲オブジェクトの時間も更新（他の機能で使用される場合のため）
            song.actualDuration = duration;
            
        } catch (error) {
            // メタデータ読み込みエラーは通常の動作なのでinfoレベルで記録
            console.info(`📝 Using default duration for ${song.title} (metadata load skipped)`);
            
            // フォールバック: songs.jsonの時間を使用
            const duration = song.duration || 180; // デフォルト3分
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            
            const durationElement = songItem.querySelector('.stat-value');
            if (durationElement) {
                durationElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                durationElement.classList.remove('duration-loading');
            }
        }
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
        
        // 難易度選択セクションまで自動スクロール
        setTimeout(() => {
            const difficultySection = document.getElementById('difficultySelection');
            if (difficultySection) {
                difficultySection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        }, 100);
    }
    
    showSongSelection() {
        this.currentStep = 'song';
        this.selectedDifficulty = null;
        
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
        
        // Stop video monitoring
        if (this.videoMonitorInterval) {
            clearInterval(this.videoMonitorInterval);
            this.videoMonitorInterval = null;
            console.log('🔍 Video monitoring stopped');
        }
        
        // Reset selections
        this.selectedSong = null;
        this.selectedDifficulty = null;
        this.currentStep = 'song';
        
        // Reset test mode flag
        this.isTestMode = false;
        
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
    
    retryGame() {
        console.log('Retrying game with same song and difficulty');
        
        if (!this.selectedSong || !this.selectedDifficulty) {
            console.error('Cannot retry: no song or difficulty selected');
            return;
        }
        
        // Stop video monitoring if active
        if (this.videoMonitorInterval) {
            clearInterval(this.videoMonitorInterval);
            this.videoMonitorInterval = null;
        }
        
        // Restart the game with the same settings
        this.startGame();
    }
    
    showDifficultySelection() {
        if (!this.selectedSong) return;
        
        this.currentStep = 'difficulty';
        const song = this.selectedSong;
        
        // Update banner information
        document.getElementById('bannerSongTitle').textContent = song.displayName || song.title;
        document.getElementById('bannerSongArtist').textContent = song.artistDisplayName || song.artist;
        // BPM表示を削除
        document.getElementById('bannerDuration').textContent = `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}`;
        
        // Setup banner video - 改善版
        const bannerVideo = document.getElementById('bannerVideo');
        if (song.backgroundVideo) {
            console.log('Setting banner video:', song.backgroundVideo);
            
            // 既存の再生を確実に停止
            if (!bannerVideo.paused) {
                bannerVideo.pause();
            }
            
            // 全てのイベントリスナーをクリア（重複を防ぐ）
            const newBannerVideo = bannerVideo.cloneNode();
            bannerVideo.parentNode.replaceChild(newBannerVideo, bannerVideo);
            
            // 新しい動画要素を使用
            const freshBannerVideo = document.getElementById('bannerVideo');
            
            // プリロードとミュート設定
            freshBannerVideo.muted = true; // 自動再生のため必須
            freshBannerVideo.preload = 'metadata';
            
            // ソース設定後に再生を試行
            const setupVideoPlayback = () => {
                return new Promise((resolve, reject) => {
                    freshBannerVideo.currentTime = song.preview?.videoStart || 0;
                    
                    const playPromise = freshBannerVideo.play();
                    if (playPromise !== undefined) {
                        playPromise
                            .then(() => {
                                console.log('Banner video autoplay successful');
                                resolve();
                            })
                            .catch(e => {
                                console.log('Banner video autoplay blocked:', e.name);
                                reject(e);
                            });
                    } else {
                        resolve();
                    }
                });
            };
            
            // メタデータ読み込み完了後に再生
            freshBannerVideo.addEventListener('loadedmetadata', () => {
                setupVideoPlayback().catch(e => {
                    console.log('Banner video play after metadata load failed:', e.name);
                });
            }, { once: true });
            
            // 待機中のフィードバック（頻度を制限）
            let bufferingCount = 0;
            freshBannerVideo.addEventListener('waiting', () => {
                if (bufferingCount++ < 5) { // 最初の5回のみログ
                    console.log('Video buffering...');
                }
            });
            
            freshBannerVideo.addEventListener('canplay', () => {
                console.log('Video ready to play');
                bufferingCount = 0; // リセット
            }, { once: true });
            
            // エラーハンドリング
            freshBannerVideo.addEventListener('error', (e) => {
                console.error('Banner video error:', e.target.error);
            }, { once: true });
            
            // ソース設定
            freshBannerVideo.src = song.backgroundVideo;
        }
        
        // Apply custom colors
        const banner = document.getElementById('songBanner');
        if (song.color) {
            banner.style.setProperty('--primary-color', song.color.primary);
            banner.style.setProperty('--secondary-color', song.color.secondary);
            banner.style.setProperty('--accent-color', song.color.accent);
        }
        
        // Setup preview audio
        
        // Hide song selection, show difficulty selection immediately
        document.getElementById('songSelection').classList.remove('active');
        document.getElementById('difficultySelection').classList.add('active');
        
        console.log('Switched to difficulty selection for:', song.title);
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
        
        // Stop any existing game to reset stats
        if (this.game.isPlaying) {
            console.log('Stopping existing game to reset stats');
            this.game.stop();
        }
        
        try {
            console.log('Loading chart for difficulty:', this.selectedDifficulty);
            
            // Load chart data
            const chartPath = this.selectedSong.charts[this.selectedDifficulty];
            console.log('Chart path:', chartPath);
            
            const chartData = await this.loadChart(chartPath);
            console.log('Chart data loaded:', chartData);
            console.log('📊 Chart title:', chartData?.title, 'difficulty:', chartData?.difficulty);
            console.log('📊 Chart has', chartData.notes?.length || 0, 'notes');
            console.log('📊 First 5 notes from chart:', chartData.notes?.slice(0, 5));
            console.log('📊 Chart path used:', chartPath);
            
            // Verify chart data structure
            if (!chartData) {
                console.error('❌ chartData is null or undefined!');
                return;
            }
            if (!chartData.notes) {
                console.error('❌ chartData.notes is missing!');
                return;
            }
            if (chartData.notes.length === 0) {
                console.error('❌ chartData.notes is empty!');
                return;
            }
            
            console.log('✅ Chart data validation passed');
            
            // Setup game audio and video
            const gameAudio = document.getElementById('gameAudio');
            const bgVideo = document.getElementById('bgVideo');
            
            gameAudio.src = this.selectedSong.audio;
            console.log('Audio src set to:', this.selectedSong.audio);
            
            if (this.selectedSong.video) {
                // CRITICAL: Reset video properties before setting source
                bgVideo.playbackRate = 1.0;
                bgVideo.defaultPlaybackRate = 1.0;
                bgVideo.loop = false; // Ensure no looping
                bgVideo.currentTime = 0;
                
                // Set video source with data attribute as backup
                bgVideo.src = this.selectedSong.backgroundVideo || '';
                bgVideo.dataset.videoSrc = this.selectedSong.backgroundVideo || '';
                console.log('Video src set to:', this.selectedSong.backgroundVideo);
                console.log('Video properties reset: playbackRate=1.0, loop=false');
            }
            
            this.showScreen('game');
            
            // 🎮 NEW LOADING SYSTEM - Preload all assets before starting
            this.showLoadingScreen();
            this.preloadAllAssets(gameAudio, bgVideo, chartData);
            
        } catch (error) {
            console.error('Error starting game:', error);
            alert('ゲームの開始に失敗しました: ' + error.message);
        }
    }
    
    async loadChart(chartPath) {
        try {
            console.log('🎼 Attempting to load chart from:', chartPath);
            const response = await fetch(chartPath);
            
            if (!response.ok) {
                console.error(`❌ Chart file fetch failed: ${response.status} ${response.statusText}`);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const chartData = await response.json();
            console.log('✅ Chart file loaded successfully');
            console.log('🎼 Raw chart data first 3 notes:', chartData.notes?.slice(0, 3));
            return chartData;
        } catch (error) {
            console.error('❌ Chart file loading failed:', error);
            console.warn('⚠️  Chart file not found:', chartPath, 'Generating fallback chart...');
            // Generate simple chart as fallback
            const fallbackChart = this.generateFallbackChart();
            console.log('🔄 Generated fallback chart with', fallbackChart.notes?.length, 'notes');
            console.log('🔄 Fallback first 3 notes:', fallbackChart.notes?.slice(0, 3));
            return fallbackChart;
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
        console.log('Checking test mode. URL params:', urlParams.toString());
        
        if (urlParams.get('test') === 'true') {
            console.log('Test mode detected in URL');
            const testChart = localStorage.getItem('testChart');
            const testAudio = localStorage.getItem('testAudio');
            
            console.log('Test data found:', { 
                hasChart: !!testChart, 
                hasAudio: !!testAudio, 
                chartLength: testChart ? testChart.length : 0,
                audioSrc: testAudio 
            });
            
            if (testChart && testAudio) {
                try {
                    const chartData = JSON.parse(testChart);
                    console.log('Parsed chart data:', {
                        title: chartData.title,
                        difficulty: chartData.difficulty,
                        noteCount: chartData.notes ? chartData.notes.length : 0,
                        firstNote: chartData.notes ? chartData.notes[0] : null
                    });
                    
                    this.loadTestChart(chartData, testAudio);
                    
                    localStorage.removeItem('testChart');
                    localStorage.removeItem('testAudio');
                    
                    console.log('✅ Test mode activated successfully');
                } catch (error) {
                    console.error('❌ Error loading test data:', error);
                    alert('テストデータの読み込みに失敗しました: ' + error.message);
                }
            } else {
                console.error('❌ Test mode requested but no test data found');
                alert('テストデータが見つかりません。譜面エディタから再度テストプレイを選択してください。');
            }
        } else {
            console.log('Normal mode (not test mode)');
        }
    }
    
    loadTestChart(chartData, audioSrc) {
        console.log('🎮 Loading test chart:', {
            chartTitle: chartData.title,
            audioSrc: audioSrc,
            gameExists: !!this.game
        });
        
        // Mark as test mode
        this.isTestMode = true;
        
        const gameAudio = document.getElementById('gameAudio');
        gameAudio.src = audioSrc;
        gameAudio.load();
        
        console.log('🎵 Audio source set, switching to game screen');
        this.showScreen('game');
        
        gameAudio.addEventListener('loadeddata', () => {
            console.log('🎵 Audio loaded successfully');
            if (this.game) {
                console.log('🎮 Loading chart into game engine');
                this.game.loadChart(chartData);
                setTimeout(() => {
                    console.log('🚀 Starting test game');
                    this.game.start();
                }, 1000);
            } else {
                console.error('❌ Game engine not available for test mode');
                alert('ゲームエンジンが初期化されていません。ページを再読み込みしてください。');
            }
        }, { once: true });
        
        gameAudio.addEventListener('error', (e) => {
            console.error('❌ Audio loading error:', e);
            alert('音声ファイルの読み込みに失敗しました。');
        });
    }
    
    showLoadingScreen() {
        // Create loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            color: #00ffff;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: 'Courier New', monospace;
        `;
        
        loadingOverlay.innerHTML = `
            <div style="text-align: center;">
                <h2 style="font-size: 2rem; margin-bottom: 2rem;">LOADING GAME ASSETS</h2>
                <div id="loadingProgress" style="font-size: 1.2rem; margin-bottom: 1rem;">Preparing...</div>
                <div id="loadingBar" style="width: 300px; height: 20px; border: 2px solid #00ffff; background: rgba(0,255,255,0.1); margin-bottom: 2rem;">
                    <div id="loadingFill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #00ffff, #ff00ff); transition: width 0.3s ease;"></div>
                </div>
                <div id="countdown" style="font-size: 3rem; color: #ff6b6b;"></div>
            </div>
        `;
        
        document.body.appendChild(loadingOverlay);
    }

    async preloadAllAssets(gameAudio, bgVideo, chartData) {
        const updateProgress = (progress, message) => {
            document.getElementById('loadingProgress').textContent = message;
            document.getElementById('loadingFill').style.width = `${progress}%`;
        };

        try {
            console.log('🎮 Starting comprehensive asset preload...');
            
            // Step 1: Load chart data (already loaded)
            updateProgress(20, 'Chart data ready ✅');
            await this.delay(300);
            
            // Step 2: Preload audio
            updateProgress(40, 'Loading audio...');
            await this.preloadAudio(gameAudio);
            updateProgress(50, 'Audio ready ✅');
            
            // Step 3: Preload video (with complete recreation)
            updateProgress(60, 'Recreating and loading video...');
            const newBgVideo = await this.preloadVideo(bgVideo);
            bgVideo = newBgVideo; // Update reference to new video element
            
            // CRITICAL: Update game engine's video reference too
            if (this.game) {
                this.game.video = newBgVideo;
                console.log('🎮 Updated game engine video reference to recreated element');
            }
            
            updateProgress(70, 'Video recreated and ready ✅');
            
            // Step 4: Initialize game engine
            updateProgress(80, 'Initializing game engine...');
            if (!this.game) {
                console.error('❌ Game engine not available');
                throw new Error('Game engine initialization failed');
            }
            
            console.log('🎮 Loading chart into game engine...');
            console.log('  - Chart data notes:', chartData.notes?.length || 0);
            console.log('  - Chart first 3 notes:', chartData.notes?.slice(0, 3));
            
            this.game.loadChart(chartData);
            
            console.log('🎮 Chart loaded, verifying...');
            console.log('  - Game notes after load:', this.game.notes?.length || 0);
            if (this.game.notes && this.game.notes.length > 0) {
                console.log('  - Game first 3 notes after load:', this.game.notes.slice(0, 3).map(n => `time=${n.originalTime?.toFixed(3)}, lane=${n.lane}`));
            }
            
            updateProgress(90, 'Game engine ready ✅');
            await this.delay(300);
            
            // Step 5: Final preparations
            updateProgress(100, 'All assets loaded ✅');
            await this.delay(500);
            
            // Step 6: Countdown and synchronized start
            await this.startCountdown();
            
            // Step 7: SYNCHRONIZED START with recreated video
            console.log('🚀 SYNCHRONIZED START with recreated video element!');
            await this.synchronizedStart(gameAudio, bgVideo);
            
            // Step 8: Start continuous video monitoring
            this.startContinuousVideoMonitoring(bgVideo);
            
        } catch (error) {
            console.error('❌ Asset preload failed:', error);
            alert(`アセットの読み込みに失敗しました: ${error.message}`);
            this.backToMenu();
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async preloadAudio(audio) {
        return new Promise((resolve, reject) => {
            console.log('🎵 Preloading audio...');
            
            const onReady = () => {
                console.log(`✅ Audio preloaded: readyState=${audio.readyState}, duration=${audio.duration}`);
                resolve();
            };
            
            const onError = (e) => {
                console.error('❌ Audio preload failed:', e);
                reject(new Error('Audio loading failed'));
            };
            
            // Reset audio to ensure clean state
            audio.pause();
            audio.currentTime = 0;
            audio.load();
            
            if (audio.readyState >= 2) {
                onReady();
            } else {
                audio.addEventListener('loadeddata', onReady, { once: true });
                audio.addEventListener('error', onError, { once: true });
            }
            
            // Timeout fallback
            setTimeout(() => {
                if (audio.readyState < 2) {
                    console.warn('⚠️ Audio preload timeout, continuing anyway');
                    resolve();
                }
            }, 10000);
        });
    }

    recreateVideoElement(oldVideo) {
        console.log('🔄 NUCLEAR OPTION: Completely recreating video element from scratch');
        
        // Get video source from data attribute or src, fallback to selectedSong
        const videoSrc = oldVideo.src || oldVideo.dataset.videoSrc || 
            (this.selectedSong && this.selectedSong.backgroundVideo) || '';
            
        if (!videoSrc) {
            console.error('❌ No video source available!');
            throw new Error('No video source found');
        }
        
        console.log('🎬 Video source:', videoSrc);
        
        const gameContainer = oldVideo.parentNode || document.getElementById('game');
        
        if (!gameContainer) {
            console.error('❌ Game container not found!');
            throw new Error('Game container not found');
        }
        
        // Remove old video completely
        oldVideo.pause();
        oldVideo.removeAttribute('src');
        oldVideo.load(); // Force unload
        if (oldVideo.parentNode) {
            oldVideo.remove();
        }
        
        // Create completely new video element with ZERO interference
        const newVideo = document.createElement('video');
        newVideo.id = 'bgVideo';
        newVideo.muted = true;
        newVideo.loop = false; // CRITICAL: No looping
        newVideo.preload = 'auto';
        newVideo.playsInline = true;
        newVideo.disablePictureInPicture = true;
        newVideo.controls = false;
        newVideo.tabIndex = -1;
        
        // CRITICAL: Set playback rates IMMEDIATELY on creation
        newVideo.playbackRate = 1.0;
        newVideo.defaultPlaybackRate = 1.0;
        
        // Force minimal CSS to avoid any transform/animation interference
        newVideo.style.cssText = `
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            z-index: 1 !important;
            opacity: 0.6 !important;
            pointer-events: none !important;
            outline: none !important;
            user-select: none !important;
            transform: none !important;
            animation: none !important;
            transition: none !important;
            will-change: auto !important;
            backface-visibility: visible !important;
        `;
        
        // Insert new video at the beginning of game container
        gameContainer.insertBefore(newVideo, gameContainer.firstChild);
        
        // Set source and force reload
        newVideo.src = videoSrc;
        newVideo.load();
        
        console.log('✅ New video element created and loaded with src:', videoSrc);
        return newVideo;
    }

    async preloadVideo(video) {
        return new Promise((resolve, reject) => {
            console.log('📹 Preloading video with complete recreation...');
            
            // NUCLEAR OPTION: Completely recreate video element
            const newVideo = this.recreateVideoElement(video);
            
            const onReady = () => {
                // Final verification of video properties
                console.log('🔍 Final video verification:', {
                    playbackRate: newVideo.playbackRate,
                    defaultPlaybackRate: newVideo.defaultPlaybackRate,
                    duration: newVideo.duration,
                    readyState: newVideo.readyState,
                    loop: newVideo.loop
                });
                
                if (newVideo.playbackRate !== 1.0) {
                    console.error('🚨 VIDEO PLAYBACK RATE STILL WRONG:', newVideo.playbackRate);
                    newVideo.playbackRate = 1.0;
                }
                
                console.log(`✅ Video completely recreated and preloaded successfully`);
                resolve(newVideo);
            };
            
            const onError = (e) => {
                console.error('❌ Video recreation/preload failed:', e);
                reject(new Error('Video recreation failed'));
            };
            
            if (newVideo.readyState >= 2) {
                onReady();
            } else {
                newVideo.addEventListener('loadeddata', onReady, { once: true });
                newVideo.addEventListener('error', onError, { once: true });
            }
            
            // Timeout fallback  
            setTimeout(() => {
                if (newVideo.readyState < 2) {
                    console.warn('⚠️ Video recreation timeout, continuing anyway');
                    resolve(newVideo);
                }
            }, 10000);
        });
    }

    async startCountdown() {
        const countdown = document.getElementById('countdown');
        const messages = ['READY?', '3', '2', '1', 'START!'];
        
        for (let i = 0; i < messages.length; i++) {
            countdown.textContent = messages[i];
            countdown.style.transform = 'scale(1.2)';
            await this.delay(100);
            countdown.style.transform = 'scale(1.0)';
            
            if (i < messages.length - 1) {
                await this.delay(600);
            } else {
                await this.delay(300);
            }
        }
    }

    async synchronizedStart(audio, video) {
        console.log('🎬 SYNCHRONIZED START - All systems go!');
        
        // Remove loading overlay
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.remove();
        }
        
        // CRITICAL: Force complete reset of all media timing
        console.log('🔄 Forcing media reset to 0...');
        
        // Stop everything first
        audio.pause();
        video.pause();
        
        // CRITICAL: Fix video playback rate issues before starting
        video.playbackRate = 1.0;
        video.defaultPlaybackRate = 1.0;
        video.loop = false;
        
        // Force reset multiple times to ensure it takes
        for (let i = 0; i < 3; i++) {
            audio.currentTime = 0;
            video.currentTime = 0;
            
            // Extra protection: Re-enforce playback rate
            if (video.playbackRate !== 1.0) {
                console.warn(`🔧 Correcting video rate during reset ${i+1}: ${video.playbackRate} → 1.0`);
                video.playbackRate = 1.0;
            }
            
            await this.delay(10); // Small delay between resets
        }
        
        console.log(`🎵 Final audio currentTime: ${audio.currentTime}`);
        console.log(`📹 Final video currentTime: ${video.currentTime}`);
        
        // DEBUG: Check notes state before starting game
        console.log('🔍 PRE-START NOTES DEBUG:');
        console.log('  - Game notes count:', this.game.notes?.length || 0);
        if (this.game.notes && this.game.notes.length > 0) {
            console.log('  - First 5 notes:', this.game.notes.slice(0, 5).map(n => `time=${n.originalTime?.toFixed(3) || n.time?.toFixed(3)}, lane=${n.lane}`));
            const earlyNotes = this.game.notes.filter(n => (n.originalTime || n.time) <= 5);
            console.log('  - Early notes (≤5s):', earlyNotes.length);
        }
        
        // Start game engine FIRST with timing reset
        this.game.gameTime = 0; // Force game time to 0 as well
        this.game.start();
        
        // Small delay to ensure game engine is ready
        await this.delay(50);
        
        // Start media simultaneously with improved error handling
        console.log('🚀 Starting media playback...');
        
        // 他の動画要素を停止（競合を避ける）
        document.querySelectorAll('video').forEach(v => {
            if (v !== video && !v.paused) {
                v.pause();
            }
        });
        
        const audioPromise = audio.play()
            .then(() => {
                console.log(`🎵 Audio started at: ${audio.currentTime}`);
                return true;
            })
            .catch(e => {
                console.error('🔴 Audio play failed:', e.name);
                return false;
            });
            
        const videoPromise = video.play()
            .then(() => {
                console.log(`📹 Video started at: ${video.currentTime}`);
                return true;
            })
            .catch(e => {
                console.error('🔴 Video play failed:', e.name);
                // ビデオが失敗してもゲームを続行
                return false;
            });
        
        try {
            const [audioSuccess, videoSuccess] = await Promise.all([audioPromise, videoPromise]);
            
            if (audioSuccess) {
                console.log('✅ Audio playback started successfully!');
            } else {
                console.log('⚠️ Audio playback failed - game may not have sound');
            }
            
            if (videoSuccess) {
                console.log('✅ Video playback started successfully!');
            } else {
                console.log('⚠️ Video playback failed - game will continue without background video');
            }
            
            // Verify timing after start
            setTimeout(() => {
                const audioTime = audioSuccess ? audio.currentTime.toFixed(3) : 'N/A';
                const videoTime = videoSuccess ? video.currentTime.toFixed(3) : 'N/A';
                console.log(`🔍 Post-start verification - Audio: ${audioTime}s, Video: ${videoTime}s, Game: ${this.game.gameTime.toFixed(3)}s`);
            }, 100);
            
        } catch (error) {
            console.error('⚠️ Media playback error (continuing anyway):', error);
        }
    }

    startContinuousVideoMonitoring(video) {
        console.log('🔍 Starting continuous video speed monitoring...');
        
        let previousTime = 0;
        let frameCount = 0;
        
        const monitorInterval = setInterval(() => {
            if (!video || video.paused || !this.game || !this.game.isPlaying) {
                return;
            }
            
            // Check playback rate
            if (video.playbackRate !== 1.0) {
                console.error('🚨 VIDEO SPEED ANOMALY DETECTED!', {
                    playbackRate: video.playbackRate,
                    defaultPlaybackRate: video.defaultPlaybackRate,
                    currentTime: video.currentTime
                });
                
                // Emergency correction
                video.playbackRate = 1.0;
                video.defaultPlaybackRate = 1.0;
                console.log('🔧 Emergency video speed correction applied');
            }
            
            // Monitor time progression (every 5 checks = ~1 second)
            frameCount++;
            if (frameCount % 5 === 0) {
                const currentTime = video.currentTime;
                const timeDiff = currentTime - previousTime;
                
                // Expected: ~1 second, but allow some variance (0.8-1.2)
                if (timeDiff > 1.5) {
                    console.warn('⚠️ Video time progression too fast:', {
                        timeDiff: timeDiff.toFixed(3),
                        expected: '~1.0',
                        currentTime: currentTime.toFixed(3),
                        playbackRate: video.playbackRate
                    });
                    
                    // Double-check and fix
                    video.playbackRate = 1.0;
                }
                
                previousTime = currentTime;
            }
            
        }, 200); // Check every 200ms
        
        // Store interval reference for cleanup
        this.videoMonitorInterval = monitorInterval;
        
        console.log('✅ Video monitoring started (checking every 200ms)');
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
        
        // Handle special screen logic
        if (screenName === 'game') {
            // Double check that the game screen is visible
            setTimeout(() => {
                const gameScreen = document.getElementById('game');
                console.log('Game screen final state:', {
                    display: getComputedStyle(gameScreen).display,
                    hasActive: gameScreen.classList.contains('active')
                });
            }, 50);
        } else if (screenName === 'gameClear') {
            // Show/hide editor button based on test mode
            const editorBtn = document.getElementById('backToEditorBtn');
            if (this.isTestMode) {
                console.log('Test mode: showing editor button');
                editorBtn.style.display = 'inline-block';
            } else {
                console.log('Normal mode: hiding editor button');
                editorBtn.style.display = 'none';
            }
            
            // Show YouTube popup if song has YouTube URL
            this.showYouTubePopupIfAvailable();
        }
    }
    
    // YouTube popup methods
    showYouTubePopupIfAvailable() {
        if (!this.selectedSong || !this.selectedSong.youtubeUrl) {
            console.log('No YouTube URL available for this song');
            return;
        }
        
        console.log('Showing YouTube popup for song:', this.selectedSong.title);
        
        // Delay popup to let clear screen animation settle
        setTimeout(() => {
            this.showYouTubePopup(this.selectedSong.youtubeUrl, this.selectedSong.title);
        }, 1500); // 1.5 seconds delay
    }
    
    showYouTubePopup(youtubeUrl, songTitle) {
        const popup = document.getElementById('youtubePopup');
        const iframe = document.getElementById('youtubeIframe');
        const titleElement = document.querySelector('.youtube-popup-title');
        
        // Convert YouTube URL to embed format
        const embedUrl = this.convertToEmbedUrl(youtubeUrl);
        
        // Set iframe source and title
        iframe.src = embedUrl;
        titleElement.textContent = `${songTitle} - YouTubeで高画質・高音質版を視聴する`;
        
        // Show popup
        popup.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Setup event listeners if not already setup
        if (!this.youtubePopupListenersSetup) {
            this.setupYouTubePopupListeners(youtubeUrl);
            this.youtubePopupListenersSetup = true;
        } else {
            // Update the URL for the "Watch on YouTube" button
            document.getElementById('youtubePopupWatch').onclick = () => {
                window.open(youtubeUrl, '_blank');
                this.hideYouTubePopup();
            };
        }
    }
    
    hideYouTubePopup() {
        const popup = document.getElementById('youtubePopup');
        const iframe = document.getElementById('youtubeIframe');
        
        // Hide popup with fade out animation
        popup.style.animation = 'fadeOut 0.3s ease-out';
        
        setTimeout(() => {
            popup.style.display = 'none';
            popup.style.animation = ''; // Reset animation
            iframe.src = ''; // Stop video playback
            document.body.style.overflow = ''; // Restore scrolling
        }, 300);
    }
    
    convertToEmbedUrl(youtubeUrl) {
        // Extract video ID from various YouTube URL formats
        let videoId = '';
        
        // Handle youtu.be format
        if (youtubeUrl.includes('youtu.be/')) {
            videoId = youtubeUrl.split('youtu.be/')[1].split('?')[0];
        }
        // Handle youtube.com/watch format
        else if (youtubeUrl.includes('youtube.com/watch')) {
            const urlParams = new URLSearchParams(youtubeUrl.split('?')[1]);
            videoId = urlParams.get('v');
        }
        // Handle youtube.com/embed format (already embed)
        else if (youtubeUrl.includes('youtube.com/embed/')) {
            return youtubeUrl;
        }
        
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }
    
    setupYouTubePopupListeners(youtubeUrl) {
        // Close button
        document.getElementById('youtubePopupClose').addEventListener('click', () => {
            this.hideYouTubePopup();
        });
        
        // Watch on YouTube button
        document.getElementById('youtubePopupWatch').addEventListener('click', () => {
            window.open(youtubeUrl, '_blank');
            this.hideYouTubePopup();
        });
        
        // Later button
        document.getElementById('youtubePopupLater').addEventListener('click', () => {
            this.hideYouTubePopup();
        });
        
        // Close on overlay click
        document.querySelector('.youtube-popup-overlay').addEventListener('click', () => {
            this.hideYouTubePopup();
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('youtubePopup').style.display === 'flex') {
                this.hideYouTubePopup();
            }
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
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