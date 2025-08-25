class ChartEditor {
    constructor() {
        this.audio = document.getElementById('editorAudio');
        this.timestamps = [];
        this.isRecording = false;
        this.isPlaying = false;
        this.songTitle = '';
        this.generatedCharts = null;
        this.playbackInterval = null;
        this.editingTimestamp = null;
        
        this.setupEventListeners();
        this.updateUI();
    }
    
    setupEventListeners() {
        // File inputs
        document.getElementById('editorMusicFile').addEventListener('change', (e) => {
            this.loadAudioFile(e.target.files[0]);
        });
        
        document.getElementById('rawDataFile').addEventListener('change', (e) => {
            this.loadRawData(e.target.files[0]);
        });
        
        // Song title
        document.getElementById('songTitle').addEventListener('input', (e) => {
            this.songTitle = e.target.value;
        });
        
        // Control buttons
        document.getElementById('startRecording').addEventListener('click', () => {
            this.startRecording();
        });
        
        document.getElementById('stopRecording').addEventListener('click', () => {
            this.stopRecording();
        });
        
        document.getElementById('playPreview').addEventListener('click', () => {
            this.togglePreview();
        });
        
        document.getElementById('generateCharts').addEventListener('click', () => {
            this.generateCharts();
        });
        
        document.getElementById('saveRawData').addEventListener('click', () => {
            this.saveRawData();
        });
        
        document.getElementById('loadRawData').addEventListener('click', () => {
            document.getElementById('rawDataFile').click();
        });
        
        // Keyboard events for recording
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.isRecording) {
                e.preventDefault();
                this.recordTimestamp();
            }
        });
        
        // Audio time update
        this.audio.addEventListener('timeupdate', () => {
            this.updateTimeDisplay();
            if (this.isPlaying) {
                this.highlightCurrentTimestamp();
            }
        });
        
        // Audio events
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.startPlaybackHighlight();
            document.body.classList.add('playing-preview');
            document.getElementById('playPreview').classList.add('playing');
        });
        
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.stopPlaybackHighlight();
            document.body.classList.remove('playing-preview');
            document.getElementById('playPreview').classList.remove('playing');
        });
        
        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
            this.stopPlaybackHighlight();
            document.getElementById('playPreview').textContent = 'プレビュー';
            document.body.classList.remove('playing-preview');
            document.getElementById('playPreview').classList.remove('playing');
        });
    }
    
    loadAudioFile(file) {
        if (file && file.type.startsWith('audio/')) {
            const url = URL.createObjectURL(file);
            this.audio.src = url;
            this.audio.load();
            
            document.getElementById('playPreview').disabled = false;
            console.log('Audio file loaded:', file.name);
        }
    }
    
    startRecording() {
        if (!this.audio.src) {
            alert('先に音楽ファイルを読み込んでください。');
            return;
        }
        
        this.timestamps = [];
        this.isRecording = true;
        this.audio.currentTime = 0;
        this.audio.play();
        
        document.getElementById('startRecording').disabled = true;
        document.getElementById('stopRecording').disabled = false;
        document.getElementById('recordingStatus').textContent = '記録中 - スペースキーを押してリズムを記録';
        document.body.classList.add('recording');
        
        this.updateTimestampDisplay();
        console.log('Recording started');
    }
    
    stopRecording() {
        this.isRecording = false;
        this.audio.pause();
        
        document.getElementById('startRecording').disabled = false;
        document.getElementById('stopRecording').disabled = true;
        document.getElementById('generateCharts').disabled = false;
        document.getElementById('saveRawData').disabled = false;
        document.getElementById('recordingStatus').textContent = '記録完了';
        document.body.classList.remove('recording');
        
        console.log(`Recording stopped. Recorded ${this.timestamps.length} timestamps.`);
    }
    
    recordTimestamp() {
        const currentTime = this.audio.currentTime;
        this.timestamps.push({
            time: currentTime,
            index: this.timestamps.length
        });
        
        this.updateTimestampDisplay();
        this.updateRecordCount();
        
        // Visual feedback
        this.showRecordingFeedback();
    }
    
    showRecordingFeedback() {
        const status = document.getElementById('recordingStatus');
        const originalText = status.textContent;
        status.textContent = '記録中 - ★';
        setTimeout(() => {
            status.textContent = originalText;
        }, 100);
    }
    
    togglePreview() {
        if (this.isPlaying) {
            this.stopPreview();
        } else {
            this.startPreview();
        }
    }
    
    startPreview() {
        if (!this.audio.src) {
            alert('先に音楽ファイルを読み込んでください。');
            return;
        }
        
        this.audio.play();
        document.getElementById('playPreview').textContent = '停止';
    }
    
    stopPreview() {
        this.audio.pause();
        document.getElementById('playPreview').textContent = 'プレビュー';
    }
    
    generateCharts() {
        if (this.timestamps.length === 0) {
            alert('記録されたタイムスタンプがありません。');
            return;
        }
        
        const chartGenerator = new ChartGenerator();
        this.generatedCharts = chartGenerator.generateAllDifficulties(this.timestamps, this.songTitle);
        
        this.displayGeneratedCharts();
        console.log('Charts generated for all difficulties');
    }
    
    displayGeneratedCharts() {
        const chartsList = document.getElementById('chartsList');
        chartsList.innerHTML = '';
        
        Object.entries(this.generatedCharts).forEach(([difficulty, chart]) => {
            const chartDiv = document.createElement('div');
            chartDiv.className = 'chart-item';
            
            // 統計情報を計算
            const stats = this.calculateChartStats(chart);
            
            chartDiv.innerHTML = `
                <h4 class="difficulty-${difficulty}">${difficulty.toUpperCase()}</h4>
                <div class="chart-stats">
                    <div class="stat-item">
                        <span class="stat-label">総ノーツ数:</span>
                        <span class="stat-value">${chart.notes.length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">単発:</span>
                        <span class="stat-value">${stats.singleNotes}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">2キー同時:</span>
                        <span class="stat-value">${stats.doubleChords}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">3キー同時:</span>
                        <span class="stat-value">${stats.tripleChords}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">密度:</span>
                        <span class="stat-value">${stats.density.toFixed(1)}/秒</span>
                    </div>
                </div>
                <div class="chart-pattern-preview">
                    <h5>レーン使用率</h5>
                    <div class="lane-usage">
                        ${this.generateLaneUsageChart(stats.laneUsage)}
                    </div>
                </div>
                <div class="chart-controls">
                    <button class="save-btn" onclick="chartEditor.saveChart('${difficulty}')">譜面を保存</button>
                    <button class="test-btn" onclick="chartEditor.testChart('${difficulty}')">テストプレイ</button>
                    <button class="preview-btn" onclick="chartEditor.previewChart('${difficulty}')">プレビュー</button>
                </div>
            `;
            
            chartsList.appendChild(chartDiv);
        });
    }
    
    calculateChartStats(chart) {
        const chordGroups = new Set();
        const laneUsage = [0, 0, 0, 0, 0, 0];
        let singleNotes = 0;
        let doubleChords = 0;
        let tripleChords = 0;
        
        chart.notes.forEach(note => {
            laneUsage[note.lane]++;
            
            if (note.isChord) {
                chordGroups.add(note.chordGroup);
            } else {
                singleNotes++;
            }
        });
        
        // 同時押しグループの分析
        chordGroups.forEach(groupId => {
            if (groupId === null) return;
            
            const chordNotes = chart.notes.filter(n => n.chordGroup === groupId);
            if (chordNotes.length === 2) doubleChords++;
            else if (chordNotes.length === 3) tripleChords++;
        });
        
        // 密度計算（最初と最後のノーツ間の時間で割る）
        const firstNote = Math.min(...chart.notes.map(n => n.time));
        const lastNote = Math.max(...chart.notes.map(n => n.time));
        const duration = lastNote - firstNote;
        const density = duration > 0 ? chart.notes.length / duration : 0;
        
        return {
            singleNotes,
            doubleChords,
            tripleChords,
            laneUsage,
            density
        };
    }
    
    generateLaneUsageChart(laneUsage) {
        const keys = ['A', 'S', 'D', 'G', 'H', 'J'];
        const maxUsage = Math.max(...laneUsage);
        
        return laneUsage.map((usage, index) => {
            const percentage = maxUsage > 0 ? (usage / maxUsage) * 100 : 0;
            return `
                <div class="lane-bar">
                    <div class="lane-label">${keys[index]}</div>
                    <div class="lane-bar-bg">
                        <div class="lane-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="lane-count">${usage}</div>
                </div>
            `;
        }).join('');
    }
    
    previewChart(difficulty) {
        if (!this.generatedCharts || !this.generatedCharts[difficulty]) {
            alert('譜面が生成されていません。');
            return;
        }
        
        const chart = this.generatedCharts[difficulty];
        console.log(`${difficulty} Chart Preview:`, chart);
        
        // 最初の10秒間のノーツパターンを表示
        const previewNotes = chart.notes.filter(note => note.time <= 10);
        
        let patternText = `${difficulty.toUpperCase()} 譜面プレビュー（最初の10秒）:\n\n`;
        patternText += '時間      レーン      タイプ\n';
        patternText += '------------------------\n';
        
        previewNotes.forEach(note => {
            const time = note.time.toFixed(2).padStart(6);
            const lane = this.keys[note.lane].padStart(6);
            const type = note.isChord ? '同時押し' : '単発';
            patternText += `${time}s    ${lane}      ${type}\n`;
        });
        
        alert(patternText);
    }
    
    saveChart(difficulty) {
        if (!this.generatedCharts || !this.generatedCharts[difficulty]) {
            alert('譜面が生成されていません。');
            return;
        }
        
        const chart = this.generatedCharts[difficulty];
        const filename = `${this.songTitle || 'chart'}_${difficulty}.json`;
        
        const blob = new Blob([JSON.stringify(chart, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log(`Chart saved: ${filename}`);
    }
    
    testChart(difficulty) {
        if (!this.generatedCharts || !this.generatedCharts[difficulty]) {
            alert('譜面が生成されていません。');
            return;
        }
        
        // Store chart data for the main game to use
        localStorage.setItem('testChart', JSON.stringify(this.generatedCharts[difficulty]));
        localStorage.setItem('testAudio', this.audio.src);
        
        // Redirect to main game
        window.location.href = 'index.html?test=true';
    }
    
    saveRawData() {
        if (this.timestamps.length === 0) {
            alert('記録されたタイムスタンプがありません。');
            return;
        }
        
        const rawData = {
            title: this.songTitle || 'Untitled',
            recordedAt: new Date().toISOString(),
            timestamps: this.timestamps,
            totalDuration: this.audio.duration,
            bpm: this.estimateBPM()
        };
        
        const filename = `${this.songTitle || 'raw_data'}_timestamps.json`;
        const blob = new Blob([JSON.stringify(rawData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log(`Raw data saved: ${filename}`);
    }
    
    loadRawData(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const rawData = JSON.parse(e.target.result);
                
                this.timestamps = rawData.timestamps || [];
                this.songTitle = rawData.title || '';
                document.getElementById('songTitle').value = this.songTitle;
                
                this.updateTimestampDisplay();
                this.updateRecordCount();
                
                document.getElementById('generateCharts').disabled = false;
                document.getElementById('saveRawData').disabled = false;
                
                console.log(`Raw data loaded: ${this.timestamps.length} timestamps`);
            } catch (error) {
                alert('ファイルの読み込みに失敗しました。');
                console.error('Error loading raw data:', error);
            }
        };
        
        reader.readAsText(file);
    }
    
    estimateBPM() {
        if (this.timestamps.length < 4) return null;
        
        const intervals = [];
        for (let i = 1; i < this.timestamps.length; i++) {
            intervals.push(this.timestamps[i].time - this.timestamps[i-1].time);
        }
        
        intervals.sort((a, b) => a - b);
        const medianInterval = intervals[Math.floor(intervals.length / 2)];
        const bpm = 60 / medianInterval;
        
        return Math.round(bpm);
    }
    
    updateTimestampDisplay() {
        const timestampList = document.getElementById('timestampList');
        timestampList.innerHTML = '';
        
        this.timestamps.forEach((timestamp, index) => {
            const div = document.createElement('div');
            div.className = 'timestamp-item';
            div.dataset.index = index;
            div.innerHTML = `
                <span class="timestamp-number">#${index + 1}</span>
                <span class="timestamp-time">${timestamp.time.toFixed(3)}秒</span>
                <div class="timestamp-controls">
                    <button class="edit-btn" onclick="chartEditor.editTimestamp(${index})">編集</button>
                    <button class="delete-btn" onclick="chartEditor.removeTimestamp(${index})">削除</button>
                    <button class="seek-btn" onclick="chartEditor.seekToTimestamp(${index})">移動</button>
                </div>
            `;
            timestampList.appendChild(div);
        });
    }
    
    removeTimestamp(index) {
        this.timestamps.splice(index, 1);
        this.timestamps.forEach((timestamp, i) => {
            timestamp.index = i;
        });
        
        this.updateTimestampDisplay();
        this.updateRecordCount();
    }
    
    editTimestamp(index) {
        const timestamp = this.timestamps[index];
        if (!timestamp) return;
        
        const newTime = prompt(`タイムスタンプを編集してください（秒）:`, timestamp.time.toFixed(3));
        if (newTime === null) return;
        
        const parsedTime = parseFloat(newTime);
        if (isNaN(parsedTime) || parsedTime < 0) {
            alert('有効な時間を入力してください。');
            return;
        }
        
        timestamp.time = parsedTime;
        
        // Re-sort timestamps by time
        this.timestamps.sort((a, b) => a.time - b.time);
        this.timestamps.forEach((ts, i) => {
            ts.index = i;
        });
        
        this.updateTimestampDisplay();
        console.log(`Timestamp ${index} edited to ${parsedTime}s`);
    }
    
    seekToTimestamp(index) {
        const timestamp = this.timestamps[index];
        if (!timestamp || !this.audio.src) return;
        
        this.audio.currentTime = timestamp.time;
        this.highlightTimestamp(index);
        console.log(`Seeked to timestamp ${index}: ${timestamp.time}s`);
    }
    
    updateRecordCount() {
        document.getElementById('recordCount').textContent = this.timestamps.length;
    }
    
    updateTimeDisplay() {
        const currentTime = this.audio.currentTime || 0;
        document.getElementById('currentTime').textContent = currentTime.toFixed(2);
    }
    
    startPlaybackHighlight() {
        // Clear any existing interval
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
        }
        
        // Update highlights every 50ms for smooth experience
        this.playbackInterval = setInterval(() => {
            if (this.isPlaying) {
                this.highlightCurrentTimestamp();
            }
        }, 50);
    }
    
    stopPlaybackHighlight() {
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
        
        // Remove all highlights
        document.querySelectorAll('.timestamp-item').forEach(item => {
            item.classList.remove('playing', 'active', 'upcoming');
        });
    }
    
    highlightCurrentTimestamp() {
        const currentTime = this.audio.currentTime;
        const tolerance = 0.1; // 100ms tolerance
        
        document.querySelectorAll('.timestamp-item').forEach((item, index) => {
            const timestamp = this.timestamps[index];
            if (!timestamp) return;
            
            item.classList.remove('playing', 'active', 'upcoming');
            
            const timeDiff = timestamp.time - currentTime;
            
            if (Math.abs(timeDiff) <= tolerance) {
                // Current timestamp being played
                item.classList.add('playing');
            } else if (timeDiff > 0 && timeDiff <= 2) {
                // Upcoming timestamp (within 2 seconds)
                item.classList.add('upcoming');
            } else if (timeDiff < 0 && timeDiff >= -1) {
                // Recently passed timestamp (within 1 second)
                item.classList.add('active');
            }
        });
    }
    
    highlightTimestamp(index) {
        // Remove all highlights
        document.querySelectorAll('.timestamp-item').forEach(item => {
            item.classList.remove('playing', 'active', 'upcoming', 'selected');
        });
        
        // Highlight the selected timestamp
        const item = document.querySelector(`[data-index="${index}"]`);
        if (item) {
            item.classList.add('selected');
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    updateUI() {
        this.updateTimestampDisplay();
        this.updateRecordCount();
        this.updateTimeDisplay();
    }
}

// Initialize editor
let chartEditor = null;

document.addEventListener('DOMContentLoaded', () => {
    chartEditor = new ChartEditor();
    console.log('Chart editor initialized');
});