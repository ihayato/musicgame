class ChartEditor {
    constructor() {
        this.audio = document.getElementById('editorAudio');
        this.timestamps = [];
        this.isRecording = false;
        this.isPlaying = false;
        this.isEditMode = false;
        this.songTitle = '';
        this.generatedCharts = null;
        this.playbackInterval = null;
        this.editingTimestamp = null;
        this.nearestTimestampIndex = -1;
        this.editModeRange = 0.5; // 500ms範囲でタイムスタンプを検索
        this.isAutoSave = false;
        this.autoSaveInterval = null;
        this.hasUnsavedChanges = false;
        this.currentAudioFile = null;
        
        this.setupEventListeners();
        this.updateUI();
        this.checkForAutoSavedData();
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
        
        // Edit mode toggle
        document.getElementById('editModeToggle').addEventListener('click', () => {
            this.toggleEditMode();
        });
        
        // Progress save/load buttons
        document.getElementById('saveProgress').addEventListener('click', () => {
            this.saveProgress();
        });
        
        document.getElementById('loadProgress').addEventListener('click', () => {
            document.getElementById('progressFile').click();
        });
        
        document.getElementById('progressFile').addEventListener('change', (e) => {
            this.loadProgress(e.target.files[0]);
        });
        
        document.getElementById('autoSaveToggle').addEventListener('click', () => {
            this.toggleAutoSave();
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
        
        // Keyboard events for recording and editing
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.isRecording) {
                    this.recordTimestamp();
                } else if (this.isEditMode && this.isPlaying) {
                    this.editTimestamp();
                }
            }
        });
        
        // Audio time update
        this.audio.addEventListener('timeupdate', () => {
            this.updateTimeDisplay();
            if (this.isPlaying) {
                this.highlightCurrentTimestamp();
                if (this.isEditMode) {
                    this.updateNearestTimestamp();
                }
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
            this.currentAudioFile = file;
            
            document.getElementById('playPreview').disabled = false;
            document.getElementById('editModeToggle').disabled = false;
            document.getElementById('saveProgress').disabled = false;
            
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
        this.markUnsavedChanges();
        
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
        console.log('🧪 Test chart requested for difficulty:', difficulty);
        
        if (!this.generatedCharts || !this.generatedCharts[difficulty]) {
            console.error('❌ No chart generated for difficulty:', difficulty);
            alert('譜面が生成されていません。まず「譜面生成」ボタンを押してください。');
            return;
        }
        
        const chartData = this.generatedCharts[difficulty];
        const audioSrc = this.audio.src;
        
        console.log('📊 Test data prepared:', {
            difficulty: difficulty,
            chartTitle: chartData.title,
            noteCount: chartData.notes ? chartData.notes.length : 0,
            audioSrc: audioSrc,
            audioExists: !!audioSrc
        });
        
        if (!audioSrc) {
            console.error('❌ No audio file loaded');
            alert('音声ファイルが読み込まれていません。先に音楽ファイルを選択してください。');
            return;
        }
        
        if (!chartData.notes || chartData.notes.length === 0) {
            console.error('❌ Chart has no notes');
            alert('譜面にノーツがありません。記録を開始して譜面を作成してください。');
            return;
        }
        
        // Store chart data for the main game to use
        localStorage.setItem('testChart', JSON.stringify(chartData));
        localStorage.setItem('testAudio', audioSrc);
        
        console.log('✅ Test data stored in localStorage, redirecting to game');
        
        // Show feedback
        this.showEditFeedback('テストプレイを開始します...', 'edit-playing');
        
        // Small delay to show feedback before redirect
        setTimeout(() => {
            // Redirect to main game
            window.location.href = 'index.html?test=true';
        }, 500);
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
                <span class="timestamp-time" onclick="chartEditor.playFromTimestamp(${index})">${timestamp.time.toFixed(3)}秒</span>
                <div class="timestamp-controls">
                    <button class="edit-btn" onclick="chartEditor.editTimestampManual(${index})">手動編集</button>
                    <button class="delete-btn" onclick="chartEditor.removeTimestamp(${index})">削除</button>
                    <button class="seek-btn" onclick="chartEditor.seekToTimestamp(${index})">移動</button>
                </div>
            `;
            
            // Make timestamp clickable
            div.addEventListener('click', (e) => {
                // Only trigger if not clicking on buttons
                if (!e.target.matches('button')) {
                    this.playFromTimestamp(index);
                }
            });
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
        this.markUnsavedChanges();
    }
    
    editTimestampManual(index) {
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
        this.markUnsavedChanges();
        console.log(`Timestamp ${index} manually edited to ${parsedTime}s`);
    }
    
    playFromTimestamp(index) {
        const timestamp = this.timestamps[index];
        if (!timestamp || !this.audio.src) return;
        
        // Seek to timestamp
        this.audio.currentTime = timestamp.time;
        
        // Start playing if not already playing
        if (!this.isPlaying) {
            this.audio.play().then(() => {
                // Automatically enable edit mode for convenience
                if (!this.isEditMode) {
                    this.toggleEditMode();
                }
                
                // Highlight the clicked timestamp
                this.highlightClickedTimestamp(index);
                
                // Show feedback
                this.showPlayFromFeedback(index, timestamp.time);
                
                console.log(`Playing from timestamp ${index}: ${timestamp.time.toFixed(3)}s`);
            }).catch(error => {
                console.error('Error playing audio:', error);
            });
        } else {
            // If already playing, just seek
            if (!this.isEditMode) {
                this.toggleEditMode();
            }
            
            this.highlightClickedTimestamp(index);
            this.showPlayFromFeedback(index, timestamp.time);
            
            console.log(`Seeked to timestamp ${index}: ${timestamp.time.toFixed(3)}s`);
        }
    }
    
    highlightClickedTimestamp(index) {
        // Remove all highlights
        document.querySelectorAll('.timestamp-item').forEach(item => {
            item.classList.remove('clicked-target', 'selected');
        });
        
        // Highlight the clicked timestamp with special styling
        const item = document.querySelector(`[data-index="${index}"]`);
        if (item) {
            item.classList.add('clicked-target');
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Remove the highlight after 3 seconds
            setTimeout(() => {
                item.classList.remove('clicked-target');
            }, 3000);
        }
    }
    
    showPlayFromFeedback(index, time) {
        const feedback = document.getElementById('editFeedback');
        if (!feedback) return;
        
        feedback.textContent = `🎵 #${index + 1} (${time.toFixed(3)}s) から再生中 - スペースキーで修正可能`;
        feedback.className = 'edit-feedback edit-playing';
        feedback.style.display = 'block';
        
        // Hide after 3 seconds
        setTimeout(() => {
            feedback.style.display = 'none';
        }, 3000);
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
    
    // New edit mode methods
    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        const button = document.getElementById('editModeToggle');
        
        if (this.isEditMode) {
            button.textContent = '編集モード: ON';
            button.classList.add('active');
            document.body.classList.add('edit-mode');
            this.showEditModeInstructions();
        } else {
            button.textContent = '編集モード: OFF';
            button.classList.remove('active');
            document.body.classList.remove('edit-mode');
            this.hideEditModeInstructions();
            this.nearestTimestampIndex = -1;
        }
        
        console.log(`Edit mode: ${this.isEditMode ? 'ON' : 'OFF'}`);
    }
    
    updateNearestTimestamp() {
        if (!this.isEditMode) return;
        
        const currentTime = this.audio.currentTime;
        let nearestIndex = -1;
        let nearestDistance = this.editModeRange;
        
        // Find the nearest timestamp within range
        this.timestamps.forEach((timestamp, index) => {
            const distance = Math.abs(timestamp.time - currentTime);
            if (distance <= nearestDistance) {
                nearestDistance = distance;
                nearestIndex = index;
            }
        });
        
        // Update UI highlighting
        if (this.nearestTimestampIndex !== nearestIndex) {
            this.highlightNearestTimestamp(nearestIndex);
            this.nearestTimestampIndex = nearestIndex;
        }
    }
    
    highlightNearestTimestamp(index) {
        // Remove previous nearest highlighting
        document.querySelectorAll('.timestamp-item').forEach(item => {
            item.classList.remove('nearest-editable');
        });
        
        // Highlight the nearest timestamp
        if (index >= 0) {
            const item = document.querySelector(`[data-index="${index}"]`);
            if (item) {
                item.classList.add('nearest-editable');
            }
        }
    }
    
    editTimestamp() {
        if (!this.isEditMode || !this.isPlaying) return;
        
        const currentTime = this.audio.currentTime;
        
        if (this.nearestTimestampIndex >= 0) {
            // Edit existing timestamp
            const timestamp = this.timestamps[this.nearestTimestampIndex];
            const oldTime = timestamp.time;
            timestamp.time = currentTime;
            
            // Re-sort timestamps by time
            this.timestamps.sort((a, b) => a.time - b.time);
            this.timestamps.forEach((ts, i) => {
                ts.index = i;
            });
            
            this.updateTimestampDisplay();
            this.showEditFeedback(this.nearestTimestampIndex, oldTime, currentTime);
            
            console.log(`Edited timestamp ${this.nearestTimestampIndex}: ${oldTime.toFixed(3)}s → ${currentTime.toFixed(3)}s`);
        } else {
            // Add new timestamp if none is near
            this.recordTimestamp();
            this.showEditFeedback(-1, null, currentTime);
            
            console.log(`Added new timestamp: ${currentTime.toFixed(3)}s`);
        }
    }
    
    showEditFeedback(index, oldTime, newTime) {
        const feedback = document.getElementById('editFeedback');
        if (!feedback) return;
        
        if (index >= 0) {
            feedback.textContent = `編集: #${index + 1} ${oldTime.toFixed(3)}s → ${newTime.toFixed(3)}s`;
            feedback.className = 'edit-feedback edit-updated';
        } else {
            feedback.textContent = `新規追加: ${newTime.toFixed(3)}s`;
            feedback.className = 'edit-feedback edit-added';
        }
        
        feedback.style.display = 'block';
        
        // Hide after 2 seconds
        setTimeout(() => {
            feedback.style.display = 'none';
        }, 2000);
    }
    
    showEditModeInstructions() {
        const instructions = document.getElementById('editModeInstructions');
        if (instructions) {
            instructions.style.display = 'block';
        }
    }
    
    hideEditModeInstructions() {
        const instructions = document.getElementById('editModeInstructions');
        if (instructions) {
            instructions.style.display = 'none';
        }
    }
    
    // Progress save/load methods
    saveProgress() {
        const progressData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            songTitle: this.songTitle,
            audioFileName: this.currentAudioFile ? this.currentAudioFile.name : null,
            timestamps: this.timestamps,
            isRecording: this.isRecording,
            currentTime: this.audio.currentTime || 0,
            duration: this.audio.duration || 0,
            metadata: {
                recordCount: this.timestamps.length,
                estimatedBPM: this.estimateBPM(),
                lastModified: new Date().toISOString()
            }
        };
        
        const filename = `${this.songTitle || 'untitled'}_progress_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        const blob = new Blob([JSON.stringify(progressData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        // Mark as saved
        this.hasUnsavedChanges = false;
        this.updateProgressUI();
        
        this.showProgressFeedback('途中保存完了', 'success');
        console.log(`Progress saved: ${filename}`);
    }
    
    loadProgress(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const progressData = JSON.parse(e.target.result);
                
                // Restore data
                this.timestamps = progressData.timestamps || [];
                this.songTitle = progressData.songTitle || '';
                document.getElementById('songTitle').value = this.songTitle;
                
                // Update UI
                this.updateTimestampDisplay();
                this.updateRecordCount();
                this.updateProgressUI();
                
                // Enable buttons
                if (this.timestamps.length > 0) {
                    document.getElementById('generateCharts').disabled = false;
                    document.getElementById('saveRawData').disabled = false;
                }
                
                // Seek to last position if audio is available
                if (this.audio.src && progressData.currentTime) {
                    this.audio.currentTime = progressData.currentTime;
                }
                
                this.hasUnsavedChanges = false;
                this.showProgressFeedback(`途中保存データを読み込みました (${this.timestamps.length} タイムスタンプ)`, 'success');
                
                console.log(`Progress loaded: ${progressData.metadata?.recordCount || 0} timestamps`);
                
                // Show audio file warning if needed
                if (progressData.audioFileName && progressData.audioFileName !== this.currentAudioFile?.name) {
                    setTimeout(() => {
                        this.showProgressFeedback(`⚠️ 元の音声ファイル「${progressData.audioFileName}」を読み込んでください`, 'warning');
                    }, 2000);
                }
                
            } catch (error) {
                this.showProgressFeedback('途中保存データの読み込みに失敗しました', 'error');
                console.error('Error loading progress:', error);
            }
        };
        
        reader.readAsText(file);
    }
    
    toggleAutoSave() {
        this.isAutoSave = !this.isAutoSave;
        const button = document.getElementById('autoSaveToggle');
        const statusDiv = document.getElementById('autoSaveStatus');
        
        if (this.isAutoSave) {
            button.textContent = '自動保存: ON';
            button.classList.add('active');
            statusDiv.style.display = 'block';
            this.startAutoSave();
        } else {
            button.textContent = '自動保存: OFF';
            button.classList.remove('active');
            statusDiv.style.display = 'none';
            this.stopAutoSave();
        }
        
        this.updateProgressUI();
        console.log(`Auto-save: ${this.isAutoSave ? 'ON' : 'OFF'}`);
    }
    
    startAutoSave() {
        // Auto-save every 30 seconds
        this.autoSaveInterval = setInterval(() => {
            if (this.hasUnsavedChanges && this.timestamps.length > 0) {
                this.autoSaveToLocalStorage();
            }
        }, 30000);
    }
    
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
    
    autoSaveToLocalStorage() {
        const progressData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            songTitle: this.songTitle,
            audioFileName: this.currentAudioFile ? this.currentAudioFile.name : null,
            timestamps: this.timestamps,
            currentTime: this.audio.currentTime || 0,
            autoSaved: true
        };
        
        localStorage.setItem('chartEditor_autoSave', JSON.stringify(progressData));
        
        // Update UI
        const now = new Date();
        document.getElementById('lastAutoSave').textContent = 
            now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        
        this.hasUnsavedChanges = false;
        console.log('Auto-saved to localStorage');
    }
    
    checkForAutoSavedData() {
        const autoSavedData = localStorage.getItem('chartEditor_autoSave');
        if (autoSavedData) {
            try {
                const data = JSON.parse(autoSavedData);
                const saveTime = new Date(data.timestamp);
                const now = new Date();
                const timeDiff = (now - saveTime) / 1000 / 60; // minutes
                
                if (timeDiff < 60) { // Less than 1 hour old
                    setTimeout(() => {
                        if (confirm(`自動保存データが見つかりました (${Math.floor(timeDiff)}分前)。復元しますか？\n\n楽曲: ${data.songTitle || '無題'}\nタイムスタンプ数: ${data.timestamps?.length || 0}`)) {
                            this.restoreFromAutoSave(data);
                        }
                    }, 1000);
                }
            } catch (error) {
                console.error('Error checking auto-saved data:', error);
            }
        }
    }
    
    restoreFromAutoSave(data) {
        this.timestamps = data.timestamps || [];
        this.songTitle = data.songTitle || '';
        document.getElementById('songTitle').value = this.songTitle;
        
        this.updateTimestampDisplay();
        this.updateRecordCount();
        this.updateProgressUI();
        
        if (this.timestamps.length > 0) {
            document.getElementById('generateCharts').disabled = false;
            document.getElementById('saveRawData').disabled = false;
            document.getElementById('saveProgress').disabled = false;
        }
        
        this.hasUnsavedChanges = false;
        this.showProgressFeedback(`自動保存データを復元しました (${this.timestamps.length} タイムスタンプ)`, 'success');
        
        if (data.audioFileName) {
            setTimeout(() => {
                this.showProgressFeedback(`💡 音声ファイル「${data.audioFileName}」を読み込んでください`, 'info');
            }, 2000);
        }
    }
    
    markUnsavedChanges() {
        this.hasUnsavedChanges = true;
        this.updateProgressUI();
    }
    
    updateProgressUI() {
        // Update title to show unsaved changes
        const title = document.querySelector('header h1');
        if (this.hasUnsavedChanges) {
            if (!title.textContent.includes('*')) {
                title.textContent += ' *';
            }
        } else {
            title.textContent = title.textContent.replace(' *', '');
        }
    }
    
    showProgressFeedback(message, type = 'info') {
        const feedback = document.getElementById('editFeedback');
        if (!feedback) return;
        
        feedback.textContent = message;
        feedback.className = `edit-feedback edit-${type}`;
        feedback.style.display = 'block';
        
        // Hide after appropriate time based on message length
        const hideTime = Math.max(3000, message.length * 50);
        setTimeout(() => {
            feedback.style.display = 'none';
        }, hideTime);
    }
}

// Initialize editor
let chartEditor = null;

document.addEventListener('DOMContentLoaded', () => {
    chartEditor = new ChartEditor();
    console.log('Chart editor initialized');
});