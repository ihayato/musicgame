class RhythmGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.audio = document.getElementById('gameAudio');
        this.video = document.getElementById('bgVideo');
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.keys = ['A', 'S', 'D', 'F', 'G', 'H'];
        this.lanes = 6;
        this.laneWidth = 80;
        this.noteSpeed = 400; // pixels per second
        this.judgmentLine = this.canvas.height - 120;
        
        this.notes = [];
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        
        this.gameTime = 0;
        this.isPlaying = false;
        this.currentChart = null;
        
        this.judgmentTimings = {
            perfect: 0.08, // 80ms (緩和)
            good: 0.15,    // 150ms (緩和)
            poor: 0.25,    // 250ms (緩和)
            miss: 0.35     // 350ms (緩和)
        };
        
        this.scoreMultipliers = {
            perfect: 1000,
            good: 500,
            poor: 100,
            miss: 0
        };
        
        this.pressedKeys = new Set();
        this.setupEventListeners();
        this.lastTime = 0;
        this.lastRenderTime = 0;
        
        this.particles = [];
        
        
        // Judgment line animation
        this.judgmentLineGlow = 0;
        this.judgmentLinePulse = 0;
        this.judgmentLineFlash = null;
        
        // Judgment statistics for clear screen
        this.judgmentStats = {
            perfect: 0,
            good: 0,
            poor: 0,
            miss: 0
        };
        
        // Media end tracking
        this.mediaEnded = {
            audio: false,
            video: false
        };
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.judgmentLine = this.canvas.height - 120;
        
        // Force canvas style to match size
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        
        
        console.log('Canvas resized to:', this.canvas.width, 'x', this.canvas.height);
    }
    
    setupEventListeners() {
        // Capture key events at document level to prevent video interference
        document.addEventListener('keydown', (e) => this.handleKeyDown(e), true);
        document.addEventListener('keyup', (e) => this.handleKeyUp(e), true);
        
        // Prevent video element from receiving focus and key events
        if (this.video) {
            this.video.addEventListener('keydown', (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
            }, true);
            
            this.video.addEventListener('keyup', (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
            }, true);
        }
    }
    
    handleKeyDown(e) {
        const key = e.key.toUpperCase();
        if (this.keys.includes(key)) {
            // Prevent default browser behavior for game keys
            e.preventDefault();
            e.stopPropagation();
            
            if (!this.pressedKeys.has(key)) {
                this.pressedKeys.add(key);
                this.showKeyPress(key);
                if (this.isPlaying) {
                    this.checkNoteHit(key);
                }
            }
        }
    }
    
    handleKeyUp(e) {
        const key = e.key.toUpperCase();
        if (this.keys.includes(key)) {
            // Prevent default browser behavior for game keys
            e.preventDefault();
            e.stopPropagation();
            
            this.pressedKeys.delete(key);
            this.hideKeyPress(key);
        }
    }
    
    showKeyPress(key) {
        const keyElement = document.querySelector(`[data-key="${key}"]`);
        if (keyElement) {
            keyElement.classList.add('active');
        }
    }
    
    hideKeyPress(key) {
        const keyElement = document.querySelector(`[data-key="${key}"]`);
        if (keyElement) {
            keyElement.classList.remove('active');
        }
    }
    
    loadChart(chartData) {
        console.log('🎵 loadChart called with:', chartData);
        console.log('🎵 Chart data type:', typeof chartData);
        console.log('🎵 Chart data structure:', chartData ? Object.keys(chartData) : 'null');
        
        this.currentChart = chartData;
        
        if (chartData && chartData.notes && Array.isArray(chartData.notes) && chartData.notes.length > 0) {
            console.log('🎵 Processing', chartData.notes.length, 'notes from chart...');
            
            this.notes = chartData.notes.map((note, index) => {
                if (!note.time || note.lane === undefined) {
                    console.warn(`⚠️ Invalid note at index ${index}:`, note);
                }
                return {
                    ...note,
                    time: note.time,
                    originalTime: note.time,
                    y: -50 - (note.time * this.noteSpeed), // Initial position (will be recalculated in game loop)
                    hit: false
                };
            });
            
            console.log(`✅ Successfully loaded chart "${chartData.title}" (${chartData.difficulty}) with ${this.notes.length} notes`);
            console.log('🎵 First few notes:', this.notes.slice(0, 5).map(n => `time=${n.originalTime.toFixed(3)}, lane=${n.lane}`));
            console.log('🎵 Last few notes:', this.notes.slice(-3).map(n => `time=${n.originalTime.toFixed(3)}, lane=${n.lane}`));
            
            // Sort notes by time to verify order
            const sortedNotes = [...this.notes].sort((a, b) => a.originalTime - b.originalTime);
            console.log('🎵 Earliest notes (sorted):', sortedNotes.slice(0, 5).map(n => `time=${n.originalTime.toFixed(3)}, lane=${n.lane}`));
            
            console.log('🎵 Notes time range:', 
                sortedNotes.length > 0 ? 
                `${sortedNotes[0].originalTime.toFixed(3)}s - ${sortedNotes[sortedNotes.length-1].originalTime.toFixed(3)}s` : 
                'No notes');
            console.log('🎵 Total notes in memory:', this.notes.length);
        } else {
            console.error('❌ Invalid chart data provided to loadChart!');
            console.error('❌ chartData:', chartData);
            console.error('❌ chartData.notes type:', chartData?.notes ? typeof chartData.notes : 'undefined');
            console.error('❌ chartData.notes array?', chartData?.notes ? Array.isArray(chartData.notes) : false);
            console.error('❌ chartData.notes length:', chartData?.notes?.length);
            
            this.notes = []; // Clear notes array for safety
            this.currentChart = null;
        }
    }
    
    start() {
        console.log('RhythmGame.start() called');
        
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.gameTime = 0;
        this.isPlaying = true;
        this.lastTime = 0; // CRITICAL: Reset lastTime to prevent initial jump
        this.startTime = performance.now();
        
        console.log('🚀 GAME START DEBUG:');
        console.log('  - Current chart:', this.currentChart?.title, this.currentChart?.difficulty);
        console.log('  - Notes in this.notes:', this.notes ? this.notes.length : 'UNDEFINED/NULL');
        console.log('  - Notes in currentChart:', this.currentChart?.notes ? this.currentChart.notes.length : 'UNDEFINED/NULL');
        
        // CRITICAL DEBUG: Check if notes exist before modification
        if (this.notes && this.notes.length > 0) {
            console.log('  - First 5 notes at start():', this.notes.slice(0, 5).map(n => `time=${n.originalTime.toFixed(3)}, lane=${n.lane}`));
            console.log('  - Notes time range at start():', `${this.notes[0].originalTime.toFixed(3)}s - ${this.notes[this.notes.length-1].originalTime.toFixed(3)}s`);
        }
        
        // DO NOT regenerate notes - they should already be loaded from loadChart
        if (this.notes && this.notes.length > 0) {
            // Just reset the notes that were already loaded
            this.notes.forEach(note => {
                note.hit = false;
                note.originalTime = note.time;
                note.y = 0; // Will be calculated in real-time during update
            });
            console.log('Using existing notes:', this.notes.length);
            console.log('Chart title:', this.currentChart?.title, 'Difficulty:', this.currentChart?.difficulty);
            console.log('First note timing:', this.notes[0]?.originalTime || this.notes[0]?.time);
            console.log('Last note timing:', this.notes[this.notes.length - 1]?.originalTime || this.notes[this.notes.length - 1]?.time);
            console.log('Chart metadata:', this.currentChart?.metadata);
            console.log('Judgment line position:', this.judgmentLine);
        } else if (this.currentChart && this.currentChart.notes) {
            // Fallback: regenerate from chart if notes are missing
            this.notes = this.currentChart.notes.map(note => ({
                ...note,
                originalTime: note.time,
                hit: false,
                y: 0
            }));
            console.log('Regenerated notes from chart:', this.notes.length);
        } else {
            console.error('🚨 NO NOTES OR CHART DATA AVAILABLE!');
            console.log('currentChart:', this.currentChart);
            console.log('notes array:', this.notes);
            return; // Stop game start if no data
        }
        
        // Check note density in first 30 seconds
        const early = this.notes.filter(n => n.originalTime <= 30).length;
        const mid = this.notes.filter(n => n.originalTime > 30 && n.originalTime <= 60).length; 
        const late = this.notes.filter(n => n.originalTime > 60).length;
        console.log(`Note distribution: 0-30s: ${early}, 30-60s: ${mid}, 60s+: ${late}`);
        
        // Debug first 10 notes specifically
        console.log('First 10 notes:', this.notes.slice(0, 10).map(n => `time=${n.originalTime.toFixed(2)} lane=${n.lane} chord=${n.isChord}`));
        
        // Check for missing early notes with enhanced debugging
        const reallyEarlyNotes = this.notes.filter(n => n.originalTime <= 5);
        const allEarlyNotes = this.notes.filter(n => n.originalTime <= 10);
        console.log(`🔍 EARLY NOTES ANALYSIS:`);
        console.log(`  - Chart: ${this.currentChart?.title} (${this.currentChart?.difficulty})`);
        console.log(`  - Total notes in chart: ${this.currentChart?.notes?.length || 0}`);
        console.log(`  - Loaded notes in game: ${this.notes.length}`);
        console.log(`  - Notes 0-5s: ${reallyEarlyNotes.length}`);
        console.log(`  - Notes 0-10s: ${allEarlyNotes.length}`);
        
        if (reallyEarlyNotes.length === 0) {
            console.error('🚨 NO EARLY NOTES FOUND! Chart may not have loaded properly.');
            console.log('Raw chart data check:', this.currentChart.notes?.slice(0, 5));
        } else {
            console.log('✅ Early notes found:', reallyEarlyNotes.slice(0, 3).map(n => `time=${n.originalTime.toFixed(2)} lane=${n.lane}`));
        }
        
        // Check for issues with note data
        const invalidNotes = this.notes.filter(n => n.originalTime === undefined || n.lane === undefined);
        if (invalidNotes.length > 0) {
            console.error('Invalid notes found:', invalidNotes);
        }
        
        // Reset media end tracking and setup listeners
        this.mediaEnded = {
            audio: false,
            video: false
        };
        this.setupMediaEndListeners();
        
        // SKIP MEDIA SETUP - now handled by synchronized start system
        console.log('🎮 Game engine ready, media will be started by synchronization system');
        
        console.log('Starting game loop...');
        console.log('isPlaying before gameLoop:', this.isPlaying);
        console.log('Notes count before gameLoop:', this.notes.length);
        
        this.gameLoop();
        this.updateUI();
        
        console.log('Game started, isPlaying:', this.isPlaying);
        
    }
    
    startMediaIndependently() {
        console.log('🎬 Starting perfectly synchronized media playback');
        
        // NUCLEAR OPTION: Completely recreate video element
        this.recreateVideoElement();
        
        // Initialize game timing separately
        this.gameTime = 0;
        this.audioStartOffset = 0;
        
        // CRITICAL: Force both audio AND video to start from exactly 0
        this.audio.pause();
        this.video.pause();
        this.audio.currentTime = 0;
        this.video.currentTime = 0;
        this.audio.playbackRate = 1.0;
        this.audio.defaultPlaybackRate = 1.0;
        this.video.playbackRate = 1.0;
        this.video.defaultPlaybackRate = 1.0;
        console.log('🎵 Audio and Video reset to currentTime=0');
        
        // Debug video state before starting
        console.log('📹 Pre-start video state:', {
            playbackRate: this.video.playbackRate,
            defaultPlaybackRate: this.video.defaultPlaybackRate,
            currentTime: this.video.currentTime,
            paused: this.video.paused,
            muted: this.video.muted,
            loop: this.video.loop,
            autoplay: this.video.autoplay,
            src: this.video.src
        });
        
        // Wait for video to be ready before starting
        const waitForVideoReady = () => {
            return new Promise((resolve) => {
                if (this.video.readyState >= 2) {
                    resolve();
                } else {
                    this.video.addEventListener('loadeddata', resolve, { once: true });
                }
            });
        };
        
        waitForVideoReady().then(() => {
            console.log('📹 Video ready, starting SYNCHRONIZED playback...');
            
            // NEW APPROACH: Perfect synchronization using Promise.all
            // This ensures both media elements start at the exact same time
            const startSynchronizedPlayback = async () => {
                // First, ensure both are ready to play
                await Promise.all([
                    new Promise(resolve => {
                        if (this.audio.readyState >= 2) resolve();
                        else this.audio.addEventListener('canplay', resolve, { once: true });
                    }),
                    new Promise(resolve => {
                        if (this.video.readyState >= 2) resolve();
                        else this.video.addEventListener('canplay', resolve, { once: true });
                    })
                ]);
                
                console.log('🎯 Both media elements ready. Starting synchronized playback...');
                
                // Start both at exactly the same time
                const audioPromise = this.audio.play();
                const videoPromise = this.video.play();
                
                // Use Promise.all to ensure they start together
                return Promise.all([audioPromise, videoPromise]);
            };
            
            // Monitor video playback to detect speed issues
            this.startVideoMonitoring();
            
            return startSynchronizedPlayback().catch(error => {
                console.error('Synchronized playback failed:', error);
                // Fallback to sequential start
                return this.audio.play().then(() => this.video.play());
            });
        }).then(results => {
            console.log('🎬 Media playback results:', results);
            
            // Additional verification after 1 second
            setTimeout(() => {
                console.log('🔍 FINAL VIDEO VERIFICATION after 1 second:');
                console.log('📊 Video properties:', {
                    playbackRate: this.video.playbackRate,
                    duration: this.video.duration,
                    currentTime: this.video.currentTime,
                    readyState: this.video.readyState,
                    paused: this.video.paused
                });
                console.log('🎵 Audio properties:', {
                    playbackRate: this.audio.playbackRate,
                    duration: this.audio.duration,
                    currentTime: this.audio.currentTime,
                    readyState: this.audio.readyState,
                    paused: this.audio.paused
                });
                
                // Check if video is playing too fast
                const expectedTime = this.video.currentTime;
                if (expectedTime > 1.5) {
                    console.warn('⚠️ VIDEO SPEED ISSUE DETECTED! Playing too fast:', expectedTime);
                } else {
                    console.log('✅ Video playback speed looks normal');
                }
            }, 1000);
        });
    }
    
    recreateVideoElement() {
        console.log('🔄 Recreating video element from scratch');
        
        const oldVideo = this.video;
        const videoSrc = oldVideo.src;
        const gameContainer = oldVideo.parentNode;
        
        // Remove old video completely
        oldVideo.pause();
        oldVideo.removeAttribute('src');
        oldVideo.load(); // Force unload
        oldVideo.remove();
        
        // Create completely new video element with ZERO interference
        const newVideo = document.createElement('video');
        newVideo.id = 'bgVideo';
        newVideo.muted = true;
        newVideo.loop = false; // Don't loop to avoid decoder issues
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
        
        // Update reference
        this.video = newVideo;
        
        // Set source and force reload
        this.video.src = videoSrc;
        this.video.load();
        
        // Add emergency speed correction
        this.addVideoSpeedCorrection();
        
        // CRITICAL: Re-setup media end listeners for new video element
        this.setupMediaEndListeners();
        
        console.log('✅ New video element created and loaded');
    }
    
    addVideoSpeedCorrection() {
        // Emergency speed correction that continuously monitors and fixes video speed
        const speedCorrector = () => {
            if (!this.video || this.video.paused) return;
            
            // Force playback rate to 1.0 continuously
            if (this.video.playbackRate !== 1.0) {
                console.warn('🔧 Correcting video playback rate from', this.video.playbackRate, 'to 1.0');
                this.video.playbackRate = 1.0;
            }
            
            // Also ensure default rate is correct
            if (this.video.defaultPlaybackRate !== 1.0) {
                console.warn('🔧 Correcting default playback rate from', this.video.defaultPlaybackRate, 'to 1.0');
                this.video.defaultPlaybackRate = 1.0;
            }
        };
        
        // Run correction every 100ms
        this.speedCorrectionInterval = setInterval(speedCorrector, 100);
        
        // Also add event listeners to catch any rate changes
        this.video.addEventListener('ratechange', () => {
            console.log('📹 Rate change detected:', this.video.playbackRate);
            if (this.video.playbackRate !== 1.0) {
                console.warn('🔧 Emergency rate correction!');
                this.video.playbackRate = 1.0;
            }
        });
        
        console.log('✅ Video speed correction system activated');
    }
    
    startVideoMonitoring() {
        let lastTime = 0;
        let checkCount = 0;
        
        const monitor = () => {
            if (!this.isPlaying || checkCount > 10) return; // Stop after 10 checks
            
            const currentTime = this.video.currentTime;
            const deltaTime = currentTime - lastTime;
            
            if (lastTime > 0) {
                console.log(`📹 Video playback rate check ${checkCount}: ${deltaTime.toFixed(3)}s elapsed (expected ~1.0s)`);
                
                if (deltaTime > 1.3) {
                    console.error('🚨 VIDEO PLAYING TOO FAST! Delta:', deltaTime);
                } else if (deltaTime < 0.7) {
                    console.warn('⚠️ Video playing too slow! Delta:', deltaTime);
                } else {
                    console.log('✅ Video speed normal');
                }
            }
            
            lastTime = currentTime;
            checkCount++;
            
            setTimeout(monitor, 1000);
        };
        
        // Start monitoring after 2 seconds
        setTimeout(monitor, 2000);
    }
    
    stop() {
        console.log('Stopping game');
        this.isPlaying = false;
        
        // Stop and reset audio
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
        }
        
        // Stop and reset video
        if (this.video) {
            this.video.pause();
            this.video.currentTime = 0;
        }
        
        // Stop speed correction interval
        if (this.speedCorrectionInterval) {
            clearInterval(this.speedCorrectionInterval);
            this.speedCorrectionInterval = null;
        }
        
        // Reset game state
        this.gameTime = 0;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.notes.forEach(note => note.hit = false);
        this.particles = [];
        
        // Reset judgment statistics
        this.judgmentStats = {
            perfect: 0,
            good: 0,
            poor: 0,
            miss: 0
        };
        
        console.log('Game stopped and reset');
    }
    
    gameLoop(currentTime = 0) {
        if (!this.isPlaying) {
            console.log('Game loop stopped, isPlaying:', this.isPlaying);
            return;
        }
        
        // CRITICAL FIX: Prevent initial time jumps
        let deltaTime;
        if (this.lastTime === 0 || currentTime === 0) {
            // First frame or invalid time - use small default
            deltaTime = 0.016; // 60fps default
            this.lastTime = currentTime || performance.now();
        } else {
            deltaTime = (currentTime - this.lastTime) / 1000;
            
            // SAFETY: Cap deltaTime to prevent large jumps
            if (deltaTime > 0.1) { // More than 100ms is suspicious
                console.warn(`⚠️ Large deltaTime detected: ${deltaTime.toFixed(3)}s, capping to 0.016s`);
                deltaTime = 0.016;
            }
            
            this.lastTime = currentTime;
        }
        
        // SYNCHRONIZED TIMING SYSTEM - uses audio as primary timing source
        if (this.audio && this.audio.readyState >= 2 && !this.audio.paused) {
            // Use audio time as the authoritative timing source
            const audioTime = this.audio.currentTime;
            this.gameTime = audioTime;
        } else {
            // Accumulate time when audio isn't available (should be rare now)
            this.gameTime += deltaTime;
        }
        
        // Ensure time never goes backwards
        this.gameTime = Math.max(this.gameTime || 0, 0);
        
        try {
            this.update(deltaTime);
            this.render();
            
            // Check for game completion periodically
            if (this.gameTime > 0 && this.gameTime % 1 < deltaTime) {
                this.checkGameComplete();
            }
        } catch (error) {
            console.error('Error in game loop:', error);
        }
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        // Calculate note positions based on timing
        this.notes.forEach(note => {
            if (!note.hit) {
                // Time until note should hit judgment line
                const timeUntilHit = note.originalTime - this.gameTime;
                // Position: judgment line - (time until hit * speed)
                // When timeUntilHit = 2, note is 800px above judgment line
                // When timeUntilHit = 0, note is at judgment line
                note.y = this.judgmentLine - (timeUntilHit * this.noteSpeed);
                
            }
        });
        
        
        // DISABLE miss checking during sync/loading period  
        // Only start checking misses after game has been running stably
        if (this.gameTime > 2.0 && this.gameTime < 300) { // Only check misses between 2-300 seconds
            this.notes.forEach(note => {
                if (!note.hit && note.y > this.judgmentLine + 100) {
                    note.hit = true;
                    this.processJudgment('miss');
                    console.log(`Missed note at time ${note.originalTime.toFixed(3)}, current time: ${this.gameTime.toFixed(3)}`);
                }
            });
        }
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update judgment line animation
        this.updateJudgmentLineAnimation(deltaTime);
        
        // No monitoring or corrections - let media play naturally
        
        // Remove notes that are far off screen (but keep unhit notes)
        this.notes = this.notes.filter(note => {
            if (!note.hit) return true; // Keep all unhit notes
            return note.y < this.canvas.height + 200; // Remove hit notes that are off screen
        });
    }
    
    render() {
        // Re-enable rendering with optimizations
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw lanes
        this.drawLanes();
        
        // Draw notes
        this.drawNotes();
        
        // Draw judgment line
        this.drawJudgmentLine();
        
        // Draw particles
        this.drawParticles();
        
    }
    
    drawLanes() {
        const startX = (this.canvas.width - (this.lanes * this.laneWidth)) / 2;
        
        // OPTIMIZATION: Batch all lane drawing into single stroke operation
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        for (let i = 0; i <= this.lanes; i++) {
            const x = startX + (i * this.laneWidth);
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
        }
        
        this.ctx.stroke(); // Single stroke call for all lines
    }
    
    drawNotes() {
        const startX = (this.canvas.width - (this.lanes * this.laneWidth)) / 2;
        let renderedCount = 0;
        
        // OPTIMIZATION: Batch similar operations
        this.ctx.save();
        
        // First pass: Draw all note bodies (fastest)
        this.notes.forEach(note => {
            if (note.hit) return;
            if (note.y < -100 || note.y > this.canvas.height + 100) return;
            
            renderedCount++;
            const x = startX + (note.lane * this.laneWidth);
            
            // Note body only
            this.ctx.fillStyle = this.getNoteColor(note.lane);
            this.ctx.fillRect(x + 5, note.y, this.laneWidth - 10, 20);
        });
        
        // Second pass: Draw borders (skip for performance)
        if (renderedCount < 50) { // Only draw borders if not too many notes
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            
            this.notes.forEach(note => {
                if (note.hit) return;
                if (note.y < -100 || note.y > this.canvas.height + 100) return;
                
                const x = startX + (note.lane * this.laneWidth);
                this.ctx.strokeRect(x + 5, note.y, this.laneWidth - 10, 20);
            });
        }
        
        // SKIP GLOW EFFECTS - Major performance impact
        
        this.ctx.restore();
        
    }
    
    getNoteColor(lane) {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
        return colors[lane % colors.length];
    }
    
    drawJudgmentLine() {
        const centerY = this.judgmentLine;
        const width = this.canvas.width;
        
        // Calculate animation values
        const glowIntensity = (Math.sin(this.judgmentLineGlow) + 1) * 0.5; // 0-1
        const pulseScale = 1 + Math.sin(this.judgmentLinePulse) * 0.1; // 0.9-1.1
        
        this.ctx.save();
        
        // Main gradient line
        const gradient = this.ctx.createLinearGradient(0, centerY - 10, 0, centerY + 10);
        gradient.addColorStop(0, `rgba(0, 255, 255, ${0.3 + glowIntensity * 0.7})`);
        gradient.addColorStop(0.3, `rgba(0, 255, 255, ${0.8 + glowIntensity * 0.2})`);
        gradient.addColorStop(0.5, '#00ffff');
        gradient.addColorStop(0.7, `rgba(0, 255, 255, ${0.8 + glowIntensity * 0.2})`);
        gradient.addColorStop(1, `rgba(0, 255, 255, ${0.3 + glowIntensity * 0.7})`);
        
        // Outer glow
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 20 + glowIntensity * 30;
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 8 * pulseScale;
        this.ctx.beginPath();
        this.ctx.moveTo(0, centerY);
        this.ctx.lineTo(width, centerY);
        this.ctx.stroke();
        
        // Inner bright line
        this.ctx.shadowBlur = 5 + glowIntensity * 10;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, centerY);
        this.ctx.lineTo(width, centerY);
        this.ctx.stroke();
        
        // Animated light streaks
        if (glowIntensity > 0.7) {
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${glowIntensity * 0.8})`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            const streakOffset = this.judgmentLineGlow * 200 % width;
            this.ctx.moveTo(streakOffset, centerY - 5);
            this.ctx.lineTo(streakOffset + 50, centerY + 5);
            this.ctx.stroke();
        }
        
        // PERFECT hit flash effect
        if (this.judgmentLineFlash) {
            const flashIntensity = this.judgmentLineFlash.intensity;
            const flashSize = this.judgmentLineFlash.size;
            
            // Screen flash for PERFECT hits
            this.ctx.shadowColor = '#ffffff';
            this.ctx.shadowBlur = 50 * flashIntensity;
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${flashIntensity * 0.9})`;
            this.ctx.lineWidth = 15 * flashSize;
            this.ctx.beginPath();
            this.ctx.moveTo(0, centerY);
            this.ctx.lineTo(width, centerY);
            this.ctx.stroke();
            
            // Additional bright core
            this.ctx.shadowBlur = 80 * flashIntensity;
            this.ctx.strokeStyle = `rgba(0, 255, 255, ${flashIntensity})`;
            this.ctx.lineWidth = 8 * flashSize;
            this.ctx.beginPath();
            this.ctx.moveTo(0, centerY);
            this.ctx.lineTo(width, centerY);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    checkNoteHit(key) {
        const keyIndex = this.keys.indexOf(key);
        const currentTime = this.gameTime;
        
        let bestNote = null;
        let bestTiming = Infinity;
        
        this.notes.forEach(note => {
            if (note.hit || note.lane !== keyIndex) return;
            
            // Use originalTime for timing calculation
            const timing = Math.abs(note.originalTime - currentTime);
            if (timing < bestTiming && timing <= this.judgmentTimings.miss) {
                bestTiming = timing;
                bestNote = note;
            }
        });
        
        if (bestNote) {
            bestNote.hit = true;
            let judgment = 'miss';
            
            if (bestTiming <= this.judgmentTimings.perfect) judgment = 'perfect';
            else if (bestTiming <= this.judgmentTimings.good) judgment = 'good';
            else if (bestTiming <= this.judgmentTimings.poor) judgment = 'poor';
            
            console.log(`Hit ${key} - Note time: ${bestNote.originalTime.toFixed(3)}, Current: ${currentTime.toFixed(3)}, Timing: ${bestTiming.toFixed(3)}, Judgment: ${judgment}`);
            
            this.processJudgment(judgment);
            this.createHitParticles(keyIndex, judgment);
        } else {
            console.log(`Key ${key} pressed but no note found. Current time: ${currentTime.toFixed(3)}`);
        }
    }
    
    processJudgment(judgment) {
        const baseScore = this.scoreMultipliers[judgment];
        const comboBonus = judgment === 'miss' ? 0 : Math.floor(this.combo / 10) * 100;
        const finalScore = baseScore + comboBonus;
        
        this.score += finalScore;
        
        // Update judgment statistics
        this.judgmentStats[judgment]++;
        
        if (judgment === 'miss') {
            this.combo = 0;
        } else {
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
        }
        
        // Enhanced judgment line effects
        if (judgment === 'perfect') {
            this.judgmentLinePulse += 2; // Strong pulse for perfect
            this.createJudgmentLineFlash();
        } else if (judgment === 'good') {
            this.judgmentLinePulse += 1; // Medium pulse for good
        }
        
        this.showJudgment(judgment);
        this.updateUI();
        this.checkGameComplete();
    }
    
    showJudgment(judgment) {
        const judgmentElement = document.getElementById('judgment');
        judgmentElement.textContent = judgment.toUpperCase();
        judgmentElement.className = `judgment-${judgment}`;
        
        setTimeout(() => {
            judgmentElement.textContent = '';
            judgmentElement.className = '';
        }, 500);
    }
    
    updateUI() {
        document.getElementById('score').textContent = `Score: ${this.score.toLocaleString()}`;
        document.getElementById('combo').textContent = `Combo: ${this.combo}`;
    }
    
    createHitParticles(lane, judgment) {
        const startX = (this.canvas.width - (this.lanes * this.laneWidth)) / 2;
        const x = startX + (lane * this.laneWidth) + (this.laneWidth / 2);
        const y = this.judgmentLine;
        
        const colors = {
            perfect: '#00ff00',
            good: '#ffff00',
            poor: '#ff8800',
            miss: '#ff0000'
        };
        
        // Enhanced particle system for different judgments
        if (judgment === 'perfect') {
            // PERFECT hits get dramatic effects
            const particleCount = 15;
            for (let i = 0; i < particleCount; i++) {
                // Main perfect particles (bright green)
                this.particles.push({
                    x: x + (Math.random() - 0.5) * 30,
                    y: y + (Math.random() - 0.5) * 30,
                    vx: (Math.random() - 0.5) * 300,
                    vy: (Math.random() - 0.5) * 300 - 150,
                    color: colors[judgment],
                    life: 1.5, // Longer lasting
                    decay: 0.02,
                    size: Math.random() * 4 + 2 // Larger particles
                });
                
                // Additional sparkle particles (white/cyan)
                if (i < 8) {
                    this.particles.push({
                        x: x + (Math.random() - 0.5) * 50,
                        y: y + (Math.random() - 0.5) * 20,
                        vx: (Math.random() - 0.5) * 400,
                        vy: (Math.random() - 0.5) * 200 - 200,
                        color: Math.random() > 0.5 ? '#ffffff' : '#00ffff',
                        life: 1.2,
                        decay: 0.025,
                        size: Math.random() * 3 + 1
                    });
                }
            }
        } else {
            // Regular particles for other judgments
            const particleCount = judgment === 'good' ? 5 : 3;
            for (let i = 0; i < particleCount; i++) {
                this.particles.push({
                    x: x + (Math.random() - 0.5) * 20,
                    y: y + (Math.random() - 0.5) * 20,
                    vx: (Math.random() - 0.5) * 200,
                    vy: (Math.random() - 0.5) * 200 - 100,
                    color: colors[judgment],
                    life: 1.0,
                    decay: 0.025,
                    size: 3
                });
            }
        }
    }
    
    updateParticles(deltaTime) {
        this.particles.forEach(particle => {
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            particle.vy += 300 * deltaTime; // gravity
            particle.life -= particle.decay;
        });
        
        this.particles = this.particles.filter(particle => particle.life > 0);
    }
    
    updateJudgmentLineAnimation(deltaTime) {
        // Continuous glow animation
        this.judgmentLineGlow += deltaTime * 3;
        
        // Pulse animation (slower)
        this.judgmentLinePulse += deltaTime * 2;
        
        // Handle judgment line flash effects
        if (this.judgmentLineFlash) {
            this.judgmentLineFlash.intensity -= deltaTime * 6; // Flash fades over ~0.17 seconds
            if (this.judgmentLineFlash.intensity <= 0) {
                this.judgmentLineFlash = null;
            }
        }
    }
    
    createJudgmentLineFlash() {
        // Create intense flash effect for PERFECT hits
        this.judgmentLineFlash = {
            intensity: 1.0,
            color: '#ffffff',
            size: 1.5
        };
    }
    
    drawParticles() {
        // OPTIMIZATION: Skip particles if there are too many (major performance hit)
        if (this.particles.length > 20) {
            return; // Skip drawing particles when there are too many
        }
        
        // OPTIMIZATION: Batch rendering to reduce save/restore calls
        if (this.particles.length === 0) return;
        
        this.ctx.save();
        
        this.particles.forEach(particle => {
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            const radius = particle.size || 3;
            this.ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        this.ctx.restore();
    }
    
    setupMediaEndListeners() {
        // Remove existing listeners first to avoid duplicates
        if (this.audioEndHandler) {
            this.audio?.removeEventListener('ended', this.audioEndHandler);
        }
        if (this.videoEndHandler) {
            this.video?.removeEventListener('ended', this.videoEndHandler);
        }
        
        // Create new handlers
        this.audioEndHandler = () => {
            console.log('🎵 Audio ended naturally');
            this.mediaEnded.audio = true;
            this.checkGameComplete(); // Check if game should complete
        };
        
        this.videoEndHandler = () => {
            console.log('📹 Video ended naturally');
            this.mediaEnded.video = true;
            this.checkGameComplete(); // Check if game should complete
        };
        
        // Setup audio end listener
        if (this.audio) {
            this.audio.addEventListener('ended', this.audioEndHandler);
        }
        
        // Setup video end listener
        if (this.video) {
            this.video.addEventListener('ended', this.videoEndHandler);
        }
    }
    
    checkGameComplete() {
        // Use our tracked media end states
        const audioEnded = this.mediaEnded.audio || this.audio?.ended || false;
        const videoEnded = this.mediaEnded.video || this.video?.ended || false;
        
        // Game completes ONLY when both audio AND video have ended naturally
        // This ensures the game always waits for the music to finish completely
        const gameComplete = audioEnded && videoEnded;
        
        if (gameComplete) {
            console.log('Game completed! Music and video finished naturally.', {
                audioEnded: this.mediaEnded.audio, 
                videoEnded: this.mediaEnded.video,
                audioEndedNative: this.audio?.ended,
                videoEndedNative: this.video?.ended,
                gameTime: this.gameTime.toFixed(2),
                audioDuration: this.audio?.duration?.toFixed(2),
                videoDuration: this.video?.duration?.toFixed(2)
            });
            this.completeGame();
        }
    }
    
    completeGame() {
        console.log('🎉 Game Complete! Showing clear screen...');
        
        // Stop the game
        this.isPlaying = false;
        
        // Stop media
        if (this.audio) {
            this.audio.pause();
        }
        if (this.video) {
            this.video.pause();
        }
        
        // Calculate accuracy
        const totalNotes = Object.values(this.judgmentStats).reduce((a, b) => a + b, 0);
        const perfectAndGood = this.judgmentStats.perfect + this.judgmentStats.good;
        const accuracy = totalNotes > 0 ? (perfectAndGood / totalNotes) * 100 : 0;
        
        // Show clear screen with results
        this.showClearScreen({
            score: this.score,
            maxCombo: this.maxCombo,
            accuracy: accuracy,
            judgmentStats: { ...this.judgmentStats }
        });
    }
    
    showClearScreen(results) {
        // Update clear screen elements
        document.getElementById('finalScore').textContent = results.score.toLocaleString();
        document.getElementById('finalMaxCombo').textContent = results.maxCombo;
        document.getElementById('finalAccuracy').textContent = results.accuracy.toFixed(2) + '%';
        
        document.getElementById('perfectCount').textContent = results.judgmentStats.perfect;
        document.getElementById('goodCount').textContent = results.judgmentStats.good;
        document.getElementById('poorCount').textContent = results.judgmentStats.poor;
        document.getElementById('missCount').textContent = results.judgmentStats.miss;
        
        // Play clear sound effect
        const clearAudio = document.getElementById('clearAudio');
        if (clearAudio) {
            clearAudio.currentTime = 0;
            clearAudio.play().catch(e => console.log('Clear audio play failed:', e));
        }
        
        // Switch to clear screen
        this.switchToScreen('gameClear');
    }
    
    switchToScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
            screen.style.display = 'none';
        });
        
        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            targetScreen.style.display = 'block';
        }
    }
}

// Initialize game instance
let game = null;

function initGame() {
    console.log('initGame function called');
    try {
        game = new RhythmGame();
        console.log('RhythmGame instance created:', game);
        console.log('Game initialized successfully');
        return game;
    } catch (error) {
        console.error('Error initializing game:', error);
        throw error;
    }
}

// Auto-initialize when script loads
console.log('game.js loaded, RhythmGame class:', typeof RhythmGame);