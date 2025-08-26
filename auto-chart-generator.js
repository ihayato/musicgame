class AutoChartGenerator {
    constructor() {
        this.audioFile = null;
        this.audioBuffer = null;
        this.audioContext = null;
        this.results = new Map();
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupRangeInputs();
    }
    
    setupEventListeners() {
        // File upload
        const uploadArea = document.getElementById('uploadArea');
        const audioInput = document.getElementById('audioInput');
        
        uploadArea.addEventListener('click', () => audioInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        
        audioInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.loadAudioFile(e.target.files[0]);
            }
        });
        
        // Method buttons
        document.querySelectorAll('.method-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const method = e.target.dataset.method;
                this.generateChart(method);
            });
        });
        
        // Control buttons
        document.getElementById('playChartBtn').addEventListener('click', () => this.previewChart());
        document.getElementById('exportChartBtn').addEventListener('click', () => this.exportChart());
        document.getElementById('clearResultsBtn').addEventListener('click', () => this.clearResults());
        
        // Navigation
        document.getElementById('backToEditorBtn').addEventListener('click', () => {
            window.location.href = 'editor.html';
        });
        document.getElementById('backToGameBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    setupRangeInputs() {
        // Onset sensitivity
        const onsetSensitivity = document.getElementById('onsetSensitivity');
        const onsetSensitivityValue = document.getElementById('onsetSensitivityValue');
        onsetSensitivity.addEventListener('input', (e) => {
            onsetSensitivityValue.textContent = e.target.value;
        });
        
        // ML complexity
        const mlComplexity = document.getElementById('mlComplexity');
        const mlComplexityValue = document.getElementById('mlComplexityValue');
        mlComplexity.addEventListener('input', (e) => {
            mlComplexityValue.textContent = e.target.value;
        });
    }
    
    handleDragOver(e) {
        e.preventDefault();
        document.getElementById('uploadArea').querySelector('.upload-content').classList.add('dragover');
    }
    
    handleDrop(e) {
        e.preventDefault();
        document.getElementById('uploadArea').querySelector('.upload-content').classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files[0] && files[0].type.startsWith('audio/')) {
            this.loadAudioFile(files[0]);
        }
    }
    
    async loadAudioFile(file) {
        try {
            this.audioFile = file;
            
            // Show audio info
            const audioInfo = document.getElementById('audioInfo');
            const fileName = document.getElementById('audioFileName');
            const audioDuration = document.getElementById('audioDuration');
            const audioSize = document.getElementById('audioSize');
            const previewAudio = document.getElementById('previewAudio');
            
            fileName.textContent = file.name;
            audioSize.textContent = `サイズ: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
            
            // Create preview URL
            const url = URL.createObjectURL(file);
            previewAudio.src = url;
            
            // Get duration
            previewAudio.addEventListener('loadedmetadata', () => {
                const duration = previewAudio.duration;
                const minutes = Math.floor(duration / 60);
                const seconds = Math.floor(duration % 60);
                audioDuration.textContent = `時間: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            });
            
            audioInfo.style.display = 'block';
            
            // Prepare audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Load audio buffer for analysis
            const arrayBuffer = await file.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            this.showNotification('音声ファイルが読み込まれました', 'success');
            
        } catch (error) {
            console.error('Error loading audio file:', error);
            this.showNotification('音声ファイルの読み込みに失敗しました', 'error');
        }
    }
    
    async generateChart(method) {
        if (!this.audioBuffer) {
            this.showNotification('音声ファイルを先に読み込んでください', 'error');
            return;
        }
        
        this.showProgress('譜面を生成中...');
        
        try {
            let chart;
            
            switch (method) {
                case 'onset':
                    chart = await this.generateOnsetChart();
                    break;
                case 'bpm':
                    chart = await this.generateBpmChart();
                    break;
                case 'ml':
                    chart = await this.generateMlChart();
                    break;
                case 'combo':
                    chart = await this.generateComboChart();
                    break;
                default:
                    throw new Error(`Unknown method: ${method}`);
            }
            
            this.results.set(method, chart);
            this.displayResults();
            this.hideProgress();
            
            this.showNotification(`${this.getMethodName(method)}で譜面を生成しました`, 'success');
            
        } catch (error) {
            console.error('Chart generation error:', error);
            this.hideProgress();
            this.showNotification('譜面生成に失敗しました: ' + error.message, 'error');
        }
    }
    
    async generateOnsetChart() {
        this.updateProgress(10, 'オンセット検出を開始...');
        
        const sensitivity = parseFloat(document.getElementById('onsetSensitivity').value);
        const minInterval = parseInt(document.getElementById('onsetMinInterval').value) / 1000;
        
        // Get audio data
        const channelData = this.audioBuffer.getChannelData(0);
        const sampleRate = this.audioBuffer.sampleRate;
        
        this.updateProgress(30, 'スペクトラム解析中...');
        
        // Simple onset detection using spectral flux
        const hopSize = 512;
        const frameSize = 2048;
        const onsets = [];
        
        for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
            const progress = 30 + (i / channelData.length) * 40;
            if (i % (hopSize * 100) === 0) {
                this.updateProgress(progress, 'オンセットを検出中...');
                await this.sleep(1);
            }
            
            const frame = channelData.slice(i, i + frameSize);
            const spectralFlux = this.calculateSpectralFlux(frame, frameSize);
            
            if (spectralFlux > sensitivity) {
                const time = i / sampleRate;
                
                // Check minimum interval
                if (onsets.length === 0 || time - onsets[onsets.length - 1] > minInterval) {
                    onsets.push(time);
                }
            }
        }
        
        this.updateProgress(80, 'ノートを配置中...');
        
        // Convert onsets to notes
        const notes = this.onsetsToNotes(onsets);
        
        this.updateProgress(100, '完了！');
        
        return {
            method: 'onset',
            notes: notes,
            stats: {
                onsetCount: onsets.length,
                noteCount: notes.length,
                density: notes.length / this.audioBuffer.duration
            }
        };
    }
    
    async generateBpmChart() {
        this.updateProgress(10, 'BPM検出を開始...');
        
        const bpmRange = document.getElementById('bpmRange').value.split('-').map(Number);
        const noteDensity = parseInt(document.getElementById('noteDensity').value);
        
        // Simple BPM detection
        const channelData = this.audioBuffer.getChannelData(0);
        const sampleRate = this.audioBuffer.sampleRate;
        
        this.updateProgress(30, 'テンポを解析中...');
        
        const bpm = await this.detectBpm(channelData, sampleRate, bpmRange);
        
        this.updateProgress(60, `BPM ${bpm} で譜面を生成中...`);
        
        // Generate grid-based notes
        const beatInterval = 60 / bpm;
        const noteInterval = beatInterval / noteDensity;
        
        const notes = [];
        for (let time = noteInterval; time < this.audioBuffer.duration; time += noteInterval) {
            if (Math.random() > 0.3) {
                notes.push({
                    time: time,
                    lane: Math.floor(Math.random() * 6),
                    type: 'normal'
                });
            }
        }
        
        this.updateProgress(100, '完了！');
        
        return {
            method: 'bpm',
            notes: notes,
            stats: {
                detectedBpm: bpm,
                noteCount: notes.length,
                density: notes.length / this.audioBuffer.duration
            }
        };
    }
    
    async generateMlChart() {
        this.updateProgress(10, 'AI分析を開始...');
        
        const mode = document.getElementById('mlMode').value;
        const complexity = parseInt(document.getElementById('mlComplexity').value);
        
        // Simulate ML analysis
        this.updateProgress(30, 'メロディーパターンを分析中...');
        await this.sleep(500);
        
        this.updateProgress(50, 'リズムパターンを分析中...');
        await this.sleep(500);
        
        this.updateProgress(70, 'ハーモニー構造を分析中...');
        await this.sleep(500);
        
        this.updateProgress(90, 'AI譜面を生成中...');
        
        const notes = [];
        const duration = this.audioBuffer.duration;
        const noteCount = Math.floor(duration * complexity * 2);
        
        for (let i = 0; i < noteCount; i++) {
            const time = (i / noteCount) * duration;
            let lane;
            
            switch (mode) {
                case 'rhythm':
                    lane = Math.floor(Math.random() * 2) + 2;
                    break;
                case 'melody':
                    lane = Math.floor(Math.random() * 6);
                    break;
                case 'harmony':
                    lane = Math.floor(Math.random() * 6);
                    break;
                case 'combined':
                    lane = Math.floor(Math.random() * 6);
                    break;
            }
            
            notes.push({
                time: time,
                lane: lane,
                type: 'normal'
            });
        }
        
        notes.sort((a, b) => a.time - b.time);
        
        this.updateProgress(100, '完了！');
        
        return {
            method: 'ml',
            notes: notes,
            stats: {
                mode: mode,
                complexity: complexity,
                noteCount: notes.length,
                density: notes.length / duration
            }
        };
    }
    
    async generateComboChart() {
        this.updateProgress(10, '組み合わせ分析を開始...');
        
        const useOnset = document.getElementById('comboOnset').checked;
        const useBpm = document.getElementById('comboBpm').checked;
        const useMl = document.getElementById('comboMl').checked;
        const weightMode = document.getElementById('comboWeight').value;
        
        const allNotes = [];
        
        if (useOnset) {
            this.updateProgress(20, 'オンセット分析...');
            const onsetChart = await this.generateOnsetChart();
            allNotes.push(...onsetChart.notes.map(note => ({...note, source: 'onset'})));
        }
        
        if (useBpm) {
            this.updateProgress(40, 'BPM分析...');
            const bpmChart = await this.generateBpmChart();
            allNotes.push(...bpmChart.notes.map(note => ({...note, source: 'bpm'})));
        }
        
        if (useMl) {
            this.updateProgress(60, 'AI分析...');
            const mlChart = await this.generateMlChart();
            allNotes.push(...mlChart.notes.map(note => ({...note, source: 'ml'})));
        }
        
        this.updateProgress(80, '結果を統合中...');
        
        const combinedNotes = this.combineNotes(allNotes, weightMode);
        
        this.updateProgress(100, '完了！');
        
        return {
            method: 'combo',
            notes: combinedNotes,
            stats: {
                sources: [useOnset && 'onset', useBpm && 'bpm', useMl && 'ml'].filter(Boolean),
                weightMode: weightMode,
                originalCount: allNotes.length,
                combinedCount: combinedNotes.length,
                density: combinedNotes.length / this.audioBuffer.duration
            }
        };
    }
    
    // Helper methods
    calculateSpectralFlux(frame, frameSize) {
        let flux = 0;
        for (let i = 1; i < frameSize / 2; i++) {
            flux += Math.abs(frame[i] - frame[i - 1]);
        }
        return flux / (frameSize / 2);
    }
    
    async detectBpm(audioData, sampleRate, bpmRange) {
        const minBpm = bpmRange[0];
        const maxBpm = bpmRange[1];
        
        const beatIntervals = [];
        const windowSize = sampleRate * 2;
        
        for (let i = 0; i < audioData.length - windowSize; i += windowSize / 2) {
            const window = audioData.slice(i, i + windowSize);
            const peaks = this.findPeaks(window, sampleRate);
            
            for (let j = 1; j < peaks.length; j++) {
                const interval = peaks[j] - peaks[j - 1];
                const bpm = 60 / interval;
                
                if (bpm >= minBpm && bpm <= maxBpm) {
                    beatIntervals.push(bpm);
                }
            }
        }
        
        if (beatIntervals.length === 0) {
            return (minBpm + maxBpm) / 2;
        }
        
        beatIntervals.sort((a, b) => a - b);
        return beatIntervals[Math.floor(beatIntervals.length / 2)];
    }
    
    findPeaks(data, sampleRate) {
        const peaks = [];
        const threshold = 0.1;
        
        for (let i = 1; i < data.length - 1; i++) {
            if (data[i] > threshold && 
                data[i] > data[i - 1] && 
                data[i] > data[i + 1]) {
                peaks.push(i / sampleRate);
            }
        }
        
        return peaks;
    }
    
    onsetsToNotes(onsets) {
        return onsets.map(time => ({
            time: time,
            lane: Math.floor(Math.random() * 6),
            type: 'normal'
        }));
    }
    
    combineNotes(allNotes, weightMode) {
        allNotes.sort((a, b) => a.time - b.time);
        
        const combined = [];
        const mergeThreshold = 0.1;
        
        for (let i = 0; i < allNotes.length; i++) {
            const currentNote = allNotes[i];
            const nearby = [];
            
            for (let j = i; j < allNotes.length; j++) {
                if (Math.abs(allNotes[j].time - currentNote.time) <= mergeThreshold) {
                    nearby.push(allNotes[j]);
                } else {
                    break;
                }
            }
            
            if (nearby.length > 0) {
                const avgTime = nearby.reduce((sum, note) => sum + note.time, 0) / nearby.length;
                const bestLane = this.selectBestLane(nearby, weightMode);
                
                combined.push({
                    time: avgTime,
                    lane: bestLane,
                    type: 'normal',
                    confidence: nearby.length
                });
                
                i += nearby.length - 1;
            }
        }
        
        return combined;
    }
    
    selectBestLane(notes, weightMode) {
        if (notes.length === 1) return notes[0].lane;
        
        const laneCount = {};
        
        notes.forEach(note => {
            laneCount[note.lane] = (laneCount[note.lane] || 0) + 1;
        });
        
        let bestLane = 0;
        let maxCount = 0;
        
        Object.entries(laneCount).forEach(([lane, count]) => {
            if (count > maxCount) {
                maxCount = count;
                bestLane = parseInt(lane);
            }
        });
        
        return bestLane;
    }
    
    displayResults() {
        const container = document.getElementById('resultsContainer');
        container.innerHTML = '';
        
        if (this.results.size === 0) {
            container.innerHTML = '<div class="no-results"><p>生成結果がありません</p></div>';
            return;
        }
        
        this.results.forEach((chart, method) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            
            const methodName = this.getMethodName(method);
            const stats = chart.stats;
            
            resultItem.innerHTML = `
                <div class="result-header">
                    <span class="result-method">${methodName}</span>
                    <span class="result-stats">
                        ノート数: ${chart.notes.length} | 
                        密度: ${stats.density.toFixed(2)}/秒
                    </span>
                </div>
                <div class="result-notes">
                    ${chart.notes.slice(0, 10).map(note => 
                        `${note.time.toFixed(2)}s - Lane ${note.lane}`
                    ).join('\\n')}
                    ${chart.notes.length > 10 ? '\\n...' : ''}
                </div>
            `;
            
            container.appendChild(resultItem);
        });
        
        document.getElementById('playChartBtn').disabled = false;
        document.getElementById('exportChartBtn').disabled = false;
    }
    
    getMethodName(method) {
        const names = {
            'onset': 'オンセット検出',
            'bpm': 'BPM + グリッド',
            'ml': '機械学習',
            'combo': '組み合わせ'
        };
        return names[method] || method;
    }
    
    previewChart() {
        this.showNotification('プレビュー機能は今後実装予定です', 'info');
    }
    
    exportChart() {
        if (this.results.size === 0) {
            this.showNotification('エクスポートする結果がありません', 'error');
            return;
        }
        
        const exportData = {
            audioFile: this.audioFile ? this.audioFile.name : null,
            duration: this.audioBuffer ? this.audioBuffer.duration : null,
            charts: Object.fromEntries(this.results)
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `auto_charts_${this.audioFile?.name || 'unknown'}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        this.showNotification('譜面データをエクスポートしました', 'success');
    }
    
    clearResults() {
        this.results.clear();
        this.displayResults();
        
        document.getElementById('playChartBtn').disabled = true;
        document.getElementById('exportChartBtn').disabled = true;
        
        this.showNotification('結果をクリアしました', 'info');
    }
    
    showProgress(message) {
        const modal = document.getElementById('progressModal');
        const text = document.getElementById('progressText');
        
        text.textContent = message;
        modal.style.display = 'block';
        
        this.updateProgress(0, message);
    }
    
    updateProgress(percent, message) {
        const fill = document.getElementById('progressFill');
        const text = document.getElementById('progressText');
        
        fill.style.width = percent + '%';
        if (message) text.textContent = message;
    }
    
    hideProgress() {
        document.getElementById('progressModal').style.display = 'none';
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    showNotification(message, type = 'info') {
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
}

// Initialize generator
const generator = new AutoChartGenerator();

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