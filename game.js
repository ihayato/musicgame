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
        
        this.particles = [];
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.judgmentLine = this.canvas.height - 120;
        console.log('Canvas resized to:', this.canvas.width, 'x', this.canvas.height);
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }
    
    handleKeyDown(e) {
        const key = e.key.toUpperCase();
        if (this.keys.includes(key) && !this.pressedKeys.has(key)) {
            this.pressedKeys.add(key);
            this.showKeyPress(key);
            if (this.isPlaying) {
                this.checkNoteHit(key);
            }
        }
    }
    
    handleKeyUp(e) {
        const key = e.key.toUpperCase();
        if (this.keys.includes(key)) {
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
        console.log('Canvas:', this.canvas);
        console.log('Audio:', this.audio);
        console.log('Video:', this.video);
        console.log('Current chart:', this.currentChart);
        
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.gameTime = 0;
        this.isPlaying = true;
        
        if (this.currentChart) {
            this.notes = this.currentChart.notes.map(note => ({
                ...note,
                y: -50 - (note.time * this.noteSpeed),
                hit: false
            }));
            console.log('Notes generated:', this.notes.length);
            console.log('Sample notes:', this.notes.slice(0, 5).map(n => ({ time: n.time, lane: n.lane, y: n.y })));
        } else {
            console.error('No chart loaded!');
        }
        
        // Start audio and video
        try {
            this.audio.currentTime = 0;
            this.video.currentTime = 0;
            
            console.log('Starting audio playback...');
            this.audio.play().then(() => {
                console.log('Audio started successfully');
            }).catch(e => {
                console.error('Audio play failed:', e);
            });
            
            console.log('Starting video playback...');
            this.video.play().then(() => {
                console.log('Video started successfully');
            }).catch(e => {
                console.error('Video play failed:', e);
            });
        } catch (error) {
            console.error('Error starting media:', error);
        }
        
        console.log('Starting game loop...');
        this.gameLoop();
        this.updateUI();
        
        console.log('Game started, isPlaying:', this.isPlaying);
    }
    
    stop() {
        this.isPlaying = false;
        this.audio.pause();
        this.video.pause();
    }
    
    gameLoop(currentTime = 0) {
        if (!this.isPlaying) {
            console.log('Game loop stopped, isPlaying:', this.isPlaying);
            return;
        }
        
        const deltaTime = currentTime > 0 ? (currentTime - this.lastTime) / 1000 : 0.016; // Default to 60fps
        this.lastTime = currentTime;
        
        // Use audio time when available, otherwise use accumulated time
        this.gameTime = this.audio.currentTime || this.gameTime + deltaTime;
        
        try {
            this.update(deltaTime);
            this.render();
        } catch (error) {
            console.error('Error in game loop:', error);
        }
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        // Update notes position
        this.notes.forEach(note => {
            if (!note.hit) {
                note.y += this.noteSpeed * deltaTime;
            }
        });
        
        // Check for missed notes
        this.notes.forEach(note => {
            if (!note.hit && note.y > this.judgmentLine + 100) {
                note.hit = true;
                this.processJudgment('miss');
            }
        });
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Remove old notes
        this.notes = this.notes.filter(note => note.y < this.canvas.height + 100);
    }
    
    render() {
        // Clear canvas with debug background
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Debug: Draw background to ensure canvas is visible
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw lanes
        this.drawLanes();
        
        // Draw notes
        this.drawNotes();
        
        // Draw judgment line
        this.drawJudgmentLine();
        
        // Draw particles
        this.drawParticles();
        
        // Debug: Draw frame counter
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px monospace';
        this.ctx.fillText(`Time: ${this.gameTime.toFixed(2)}s`, 10, 30);
        this.ctx.fillText(`Notes: ${this.notes.filter(n => !n.hit).length}`, 10, 50);
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
        
        this.notes.forEach(note => {
            if (note.hit) return;
            
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
            
            const timing = Math.abs(note.time - currentTime);
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
            
            this.processJudgment(judgment);
            this.createHitParticles(keyIndex, judgment);
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
        
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200 - 100,
                color: colors[judgment],
                life: 1.0,
                decay: 0.02
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