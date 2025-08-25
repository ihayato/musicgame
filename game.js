class RhythmGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.audio = document.getElementById('gameAudio');
        this.video = document.getElementById('bgVideo');
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.keys = ['A', 'S', 'D', 'G', 'H', 'J'];
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
            perfect: 0.05, // 50ms
            good: 0.1,     // 100ms
            poor: 0.15,    // 150ms
            miss: 0.2      // 200ms
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
        console.log('loadChart called with:', chartData);
        this.currentChart = chartData;
        
        if (chartData && chartData.notes) {
            this.notes = chartData.notes.map(note => ({
                ...note,
                y: -50 - (note.time * this.noteSpeed),
                hit: false
            }));
            console.log(`Loaded chart "${chartData.title}" with ${this.notes.length} notes`);
            console.log('First few notes:', this.notes.slice(0, 3));
        } else {
            console.error('Invalid chart data:', chartData);
        }
    }
    
    start() {
        console.log('RhythmGame.start() called');
        
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.gameTime = 0;
        this.isPlaying = true;
        this.startTime = performance.now(); // Add performance timing reference
        
        if (this.currentChart) {
            this.notes = this.currentChart.notes.map(note => ({
                ...note,
                originalTime: note.time,
                hit: false,
                y: 0 // Will be calculated in real-time during update
            }));
            console.log('Notes generated:', this.notes.length);
            console.log('Chart title:', this.currentChart.title, 'Difficulty:', this.currentChart.difficulty);
            console.log('First note timing:', this.notes[0]?.originalTime);
            console.log('Last note timing:', this.notes[this.notes.length - 1]?.originalTime);
            console.log('Chart metadata:', this.currentChart.metadata);
            console.log('Judgment line position:', this.judgmentLine);
            
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
        } else {
            console.error('No chart loaded!');
        }
        
        // Start audio and video with proper synchronization
        try {
            this.audio.currentTime = 0;
            this.video.currentTime = 0;
            
            // Ensure video playback rate matches audio (normal speed)
            this.video.playbackRate = 1.0;
            this.audio.playbackRate = 1.0;
            
            // Initialize timing variables
            this.gameTime = 0;
            this.audioStartOffset = 0;
            
            console.log('Starting synchronized audio and video playback...');
            
            // Wait for metadata to load first
            const waitForMetadata = () => {
                return new Promise((resolve) => {
                    if (this.audio.duration && this.video.duration) {
                        resolve();
                    } else {
                        this.audio.addEventListener('loadedmetadata', resolve, { once: true });
                        this.video.addEventListener('loadedmetadata', resolve, { once: true });
                    }
                });
            };
            
            waitForMetadata().then(() => {
                console.log(`📊 Media Info:`);
                console.log(`  Audio duration: ${this.audio.duration}s`);
                console.log(`  Video duration: ${this.video.duration}s`);
                console.log(`  Audio playbackRate: ${this.audio.playbackRate}`);
                console.log(`  Video playbackRate: ${this.video.playbackRate}`);
                
                // Check for duration mismatch
                const durationDiff = Math.abs(this.audio.duration - this.video.duration);
                if (durationDiff > 1) { // More than 1 second difference
                    console.warn(`⚠️  Duration mismatch detected: Audio=${this.audio.duration.toFixed(2)}s, Video=${this.video.duration.toFixed(2)}s, Diff=${durationDiff.toFixed(2)}s`);
                    console.warn('This may cause sync issues. Consider using matching duration files.');
                }
                
                // Start audio first, then video follows with precise timing
                return this.audio.play().then(() => {
                    console.log(`Audio started at: ${this.audio.currentTime}s`);
                    
                    // Wait a tiny bit for audio to establish timing, then start video
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            this.video.currentTime = this.audio.currentTime;
                            console.log(`Setting video time to match audio: ${this.video.currentTime}s`);
                            
                            this.video.play().then(resolve).catch(resolve);
                        }, 50); // Small delay to let audio establish timing
                    });
                });
            }).then(() => {
                console.log('✅ Audio and video started simultaneously');
                console.log(`Final playback rates - Audio: ${this.audio.playbackRate}, Video: ${this.video.playbackRate}`);
                
                // Just log the initial sync status, no corrections
                setTimeout(() => {
                    const timeDiff = Math.abs(this.video.currentTime - this.audio.currentTime);
                    console.log(`📊 Initial sync status: Audio=${this.audio.currentTime.toFixed(2)}s, Video=${this.video.currentTime.toFixed(2)}s, Diff=${timeDiff.toFixed(2)}s`);
                    console.log('🎬 Video now playing naturally without sync interference');
                }, 1000);
            }).catch(e => {
                console.error('Media playback failed:', e);
            });
            
        } catch (error) {
            console.error('Error starting media:', error);
        }
        
        console.log('Starting game loop...');
        console.log('isPlaying before gameLoop:', this.isPlaying);
        console.log('Notes count before gameLoop:', this.notes.length);
        
        this.gameLoop();
        this.updateUI();
        
        console.log('Game started, isPlaying:', this.isPlaying);
        
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
        
        // Reset game state
        this.gameTime = 0;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.notes.forEach(note => note.hit = false);
        this.particles = [];
        
        console.log('Game stopped and reset');
    }
    
    gameLoop(currentTime = 0) {
        if (!this.isPlaying) {
            console.log('Game loop stopped, isPlaying:', this.isPlaying);
            return;
        }
        
        // Removed frame rate limiting - back to 60fps
        
        const deltaTime = currentTime > 0 ? (currentTime - this.lastTime) / 1000 : 0.016; // Default to 60fps
        this.lastTime = currentTime;
        
        // More robust timing system
        if (this.audio && this.audio.readyState >= 2 && !this.audio.paused) {
            // Use audio time when it's actually playing and ready
            const audioTime = this.audio.currentTime;
            if (audioTime > 0 || this.gameTime > 0) {
                this.gameTime = audioTime;
            } else {
                // Audio is loaded but hasn't started, accumulate time
                this.gameTime += deltaTime;
            }
        } else {
            // Always accumulate time when audio isn't ready or paused
            this.gameTime += deltaTime;
        }
        
        // Ensure time never goes backwards
        this.gameTime = Math.max(this.gameTime || 0, 0);
        
        // Reduced debug frequency to avoid performance impact
        if (Math.floor(this.gameTime) % 10 === 0 && Math.floor(this.gameTime) !== Math.floor(this.gameTime - deltaTime)) {
            console.log(`Timing debug: gameTime=${this.gameTime.toFixed(3)}, audioTime=${this.audio.currentTime.toFixed(3)}, deltaTime=${deltaTime.toFixed(3)}`);
        }
        
        try {
            this.update(deltaTime);
            this.render();
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
        
        // Debug: Log visible notes every second
        if (Math.floor(this.gameTime) !== Math.floor(this.gameTime - deltaTime)) {
            const allNotes = this.notes.filter(n => !n.hit);
            const upcomingNotes = allNotes.filter(n => n.originalTime > this.gameTime && n.originalTime < this.gameTime + 10);
            const visibleNotes = allNotes.filter(n => n.y > -100 && n.y < this.canvas.height + 100);
            
            console.log(`Game time: ${this.gameTime.toFixed(2)}s, Visible notes: ${visibleNotes.length}, Total active: ${allNotes.length}, Upcoming (next 10s): ${upcomingNotes.length}`);
            
            if (upcomingNotes.length > 0) {
                const next = upcomingNotes[0];
                console.log(`Next note: lane=${next.lane}, time=${next.originalTime.toFixed(2)}`);
            }
            
            // Minimal early notes debug (only when there are issues)
            if (this.gameTime < 10 && Math.floor(this.gameTime) % 5 === 0) {
                const visibleNotesCount = allNotes.filter(n => n.y > -100 && n.y < this.canvas.height + 100).length;
                if (visibleNotesCount === 0 && upcomingNotes.length > 0) {
                    console.log(`⚠️  No visible notes detected at ${this.gameTime.toFixed(1)}s despite ${upcomingNotes.length} upcoming notes`);
                }
            }
        }
        
        // Check for missed notes (notes that passed judgment line)
        // But only start checking after a brief startup period to avoid immediate misses
        if (this.gameTime > 0.5) { // Wait 500ms before checking for misses
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
        
        // SYNC DISABLED - Let video play naturally without interference
        // Only log major issues for debugging, but don't actively correct
        if (Math.floor(this.gameTime) % 30 === 0 && Math.floor(this.gameTime) !== Math.floor(this.gameTime - deltaTime)) {
            if (this.video && this.audio && !this.audio.paused && !this.video.paused) {
                const timeDiff = Math.abs(this.video.currentTime - this.audio.currentTime);
                if (timeDiff > 2.0) { // Only log major drift, don't fix it
                    console.log(`📊 Sync info (no correction): audio=${this.audio.currentTime.toFixed(2)}s, video=${this.video.currentTime.toFixed(2)}s, drift=${timeDiff.toFixed(2)}s`);
                }
            }
        }
        
        // Remove notes that are far off screen (but keep unhit notes)
        this.notes = this.notes.filter(note => {
            if (!note.hit) return true; // Keep all unhit notes
            return note.y < this.canvas.height + 200; // Remove hit notes that are off screen
        });
    }
    
    render() {
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
        
        // Debug: Show game time and note count
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px monospace';
        this.ctx.fillText(`Time: ${this.gameTime.toFixed(2)}s`, 10, 30);
        const activeNotes = this.notes.filter(n => !n.hit);
        const visibleNotes = this.notes.filter(n => !n.hit && n.y > -50 && n.y < this.canvas.height + 50);
        this.ctx.fillText(`Total: ${this.notes.length} | Active: ${activeNotes.length} | Visible: ${visibleNotes.length}`, 10, 50);
    }
    
    drawLanes() {
        const startX = (this.canvas.width - (this.lanes * this.laneWidth)) / 2;
        
        for (let i = 0; i <= this.lanes; i++) {
            const x = startX + (i * this.laneWidth);
            
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
    }
    
    drawNotes() {
        const startX = (this.canvas.width - (this.lanes * this.laneWidth)) / 2;
        let renderedCount = 0;
        
        this.notes.forEach(note => {
            if (note.hit) return;
            
            // Only render notes that are reasonably on screen
            if (note.y < -100 || note.y > this.canvas.height + 100) return;
            
            renderedCount++;
            const x = startX + (note.lane * this.laneWidth);
            
            // Note body
            this.ctx.fillStyle = this.getNoteColor(note.lane);
            this.ctx.fillRect(x + 5, note.y, this.laneWidth - 10, 20);
            
            // Note border
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x + 5, note.y, this.laneWidth - 10, 20);
            
            // Note glow effect
            const gradient = this.ctx.createRadialGradient(
                x + this.laneWidth/2, note.y + 10, 0,
                x + this.laneWidth/2, note.y + 10, 50
            );
            gradient.addColorStop(0, `${this.getNoteColor(note.lane)}88`);
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x - 20, note.y - 20, this.laneWidth + 40, 60);
        });
        
        // Debug: Show note count in top-right corner
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px monospace';
        this.ctx.fillText(`Rendered: ${renderedCount}`, this.canvas.width - 150, 30);
    }
    
    getNoteColor(lane) {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
        return colors[lane % colors.length];
    }
    
    drawJudgmentLine() {
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.judgmentLine);
        this.ctx.lineTo(this.canvas.width, this.judgmentLine);
        this.ctx.stroke();
        
        // Glow effect
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 20;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
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
        
        if (judgment === 'miss') {
            this.combo = 0;
        } else {
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
        }
        
        this.showJudgment(judgment);
        this.updateUI();
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
        
        // Reduced particle count for better performance
        const particleCount = judgment === 'perfect' ? 8 : judgment === 'good' ? 5 : 3;
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200 - 100,
                color: colors[judgment],
                life: 1.0,
                decay: 0.025 // Slightly faster decay
            });
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
    
    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
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