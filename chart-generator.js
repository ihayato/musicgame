class ChartGenerator {
    constructor() {
        this.keys = ['A', 'S', 'D', 'G', 'H', 'J'];
        this.difficulties = {
            easy: {
                noteRatio: 0.4,        // 40%のタイムスタンプを使用
                chordChance: 0,        // 同時押しなし
                maxSimultaneous: 1,    // 1キーまで
                minInterval: 0.6,      // 600ms間隔
                laneVariety: 0.7       // レーン選択の多様性
            },
            normal: {
                noteRatio: 0.7,
                chordChance: 0.15,     // 15%の確率で同時押し
                maxSimultaneous: 2,    // 2キーまで
                minInterval: 0.35,     // 350ms間隔
                laneVariety: 0.8
            },
            hard: {
                noteRatio: 0.9,
                chordChance: 0.3,      // 30%の確率で同時押し
                maxSimultaneous: 3,    // 3キーまで
                minInterval: 0.2,      // 200ms間隔
                laneVariety: 0.9
            },
            extreme: {
                noteRatio: 1.0,
                chordChance: 0.45,     // 45%の確率で同時押し
                maxSimultaneous: 3,    // 3キーまで（4キーは避ける）
                minInterval: 0.1,      // 100ms間隔
                laneVariety: 1.0
            }
        };
    }
    
    generateAllDifficulties(timestamps, title = 'Untitled') {
        const charts = {};
        
        Object.keys(this.difficulties).forEach(difficulty => {
            charts[difficulty] = this.generateChart(timestamps, difficulty, title);
        });
        
        return charts;
    }
    
    generateChart(timestamps, difficulty, title = 'Untitled') {
        const config = this.difficulties[difficulty];
        const selectedTimestamps = this.selectTimestamps(timestamps, config.noteRatio);
        const filteredTimestamps = this.filterMinInterval(selectedTimestamps, config.minInterval);
        const notes = this.generateNotes(filteredTimestamps, config);
        
        const chart = {
            title: title,
            difficulty: difficulty,
            notes: notes,
            metadata: {
                totalNotes: notes.length,
                chordNotes: notes.filter(n => n.isChord).length,
                generatedAt: new Date().toISOString(),
                originalTimestamps: timestamps.length,
                filteredTimestamps: filteredTimestamps.length
            }
        };
        
        console.log(`Generated ${difficulty} chart: ${notes.length} notes`);
        return chart;
    }
    
    selectTimestamps(timestamps, ratio) {
        if (ratio >= 1.0) return [...timestamps];
        
        const selected = [];
        const step = 1 / ratio;
        
        for (let i = 0; i < timestamps.length; i += step) {
            const index = Math.floor(i);
            if (index < timestamps.length) {
                selected.push(timestamps[index]);
            }
        }
        
        return selected;
    }
    
    filterMinInterval(timestamps, minInterval) {
        if (timestamps.length === 0) return [];
        
        const filtered = [timestamps[0]];
        
        for (let i = 1; i < timestamps.length; i++) {
            const lastTime = filtered[filtered.length - 1].time;
            const currentTime = timestamps[i].time;
            
            if (currentTime - lastTime >= minInterval) {
                filtered.push(timestamps[i]);
            }
        }
        
        return filtered;
    }
    
    generateNotes(timestamps, config) {
        const notes = [];
        let lastUsedLanes = [];
        let chordGroupCounter = 0;
        
        timestamps.forEach((timestamp, index) => {
            const shouldMakeChord = Math.random() < config.chordChance;
            let chordSize = 1;
            
            if (shouldMakeChord) {
                // 同時押しサイズを決定（2-3キー、時々1キー）
                if (config.maxSimultaneous >= 3) {
                    const rand = Math.random();
                    if (rand < 0.3) chordSize = 3;      // 30% - 3キー同時
                    else if (rand < 0.7) chordSize = 2; // 40% - 2キー同時  
                    else chordSize = 1;                 // 30% - 単発
                } else if (config.maxSimultaneous >= 2) {
                    chordSize = Math.random() < 0.6 ? 2 : 1; // 60% - 2キー, 40% - 単発
                }
            }
            
            const selectedLanes = this.selectLanes(chordSize, lastUsedLanes, config);
            
            // ノーツを生成
            selectedLanes.forEach(lane => {
                notes.push({
                    time: timestamp.time,
                    lane: lane,
                    isChord: chordSize > 1,
                    chordGroup: chordSize > 1 ? chordGroupCounter : null
                });
            });
            
            if (chordSize > 1) {
                chordGroupCounter++;
            }
            
            lastUsedLanes = selectedLanes;
        });
        
        return notes.sort((a, b) => a.time - b.time);
    }
    
    selectLanes(count, lastUsedLanes = [], config = {}) {
        const availableLanes = [0, 1, 2, 3, 4, 5];
        
        if (count === 1) {
            return this.selectSingleLane(lastUsedLanes, config);
        } else {
            return this.selectChordLanes(count, lastUsedLanes, config);
        }
    }
    
    selectSingleLane(lastUsedLanes = [], config = {}) {
        const availableLanes = [0, 1, 2, 3, 4, 5];
        
        // 前回使用したレーンを避ける（多様性のため）
        let preferredLanes = availableLanes.filter(lane => 
            !lastUsedLanes.includes(lane)
        );
        
        // 避けるレーンがない場合は全レーンから選択
        if (preferredLanes.length === 0) {
            preferredLanes = availableLanes;
        }
        
        // ランダム選択
        const randomIndex = Math.floor(Math.random() * preferredLanes.length);
        return [preferredLanes[randomIndex]];
    }
    
    selectChordLanes(count, lastUsedLanes = [], config = {}) {
        const availableLanes = [0, 1, 2, 3, 4, 5];
        const selectedLanes = [];
        
        // 同時押しのパターンを定義（音楽的に自然なパターン）
        const chordPatterns = {
            2: [ // 2キー同時押しパターン
                [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], // 隣接
                [0, 2], [1, 3], [2, 4], [3, 5],         // 1つ飛ばし
                [0, 3], [1, 4], [2, 5],                 // 2つ飛ばし
                [0, 5]                                  // 両端
            ],
            3: [ // 3キー同時押しパターン
                [0, 1, 2], [1, 2, 3], [2, 3, 4], [3, 4, 5], // 連続3個
                [0, 2, 4], [1, 3, 5],                       // 1つ飛ばし
                [0, 1, 3], [1, 2, 4], [2, 3, 5],           // 混合パターン
                [0, 2, 5], [0, 3, 5], [1, 3, 4],           // その他のパターン
                [0, 1, 5], [1, 4, 5]                       // 両端含む
            ]
        };
        
        const patterns = chordPatterns[count] || [];
        
        if (patterns.length === 0) {
            // フォールバック: ランダム選択
            const shuffled = [...availableLanes].sort(() => Math.random() - 0.5);
            return shuffled.slice(0, count).sort((a, b) => a - b);
        }
        
        // 前回のパターンと重複しないように選択
        let availablePatterns = patterns.filter(pattern => {
            const overlap = pattern.filter(lane => lastUsedLanes.includes(lane));
            return overlap.length < pattern.length; // 完全重複は避ける
        });
        
        // 使用可能なパターンがない場合は全パターンから選択
        if (availablePatterns.length === 0) {
            availablePatterns = patterns;
        }
        
        // ランダムにパターンを選択
        const randomPattern = availablePatterns[
            Math.floor(Math.random() * availablePatterns.length)
        ];
        
        return randomPattern.sort((a, b) => a - b);
    }
    
    // Advanced pattern generation methods
    generatePatternBasedChart(timestamps, difficulty, patterns = []) {
        const config = this.difficulties[difficulty];
        const notes = [];
        
        // Predefined patterns for more musical results
        const commonPatterns = [
            [0, 1],      // Adjacent lanes
            [2, 3],
            [4, 5],
            [0, 2, 4],   // Every other lane
            [1, 3, 5],
            [0, 5],      // Outer lanes
            [1, 4],
            [2, 3, 4]    // Center cluster
        ];
        
        let patternIndex = 0;
        let lastLanes = [];
        
        timestamps.forEach((timestamp, index) => {
            const shouldMakeChord = Math.random() < config.chordChance;
            
            if (shouldMakeChord) {
                const pattern = commonPatterns[patternIndex % commonPatterns.length];
                const chordSize = Math.min(pattern.length, config.maxSimultaneous);
                
                for (let i = 0; i < chordSize; i++) {
                    notes.push({
                        time: timestamp.time,
                        lane: pattern[i],
                        isChord: true,
                        chordGroup: index
                    });
                }
                
                lastLanes = pattern.slice(0, chordSize);
                patternIndex++;
            } else {
                const availableLanes = [0, 1, 2, 3, 4, 5].filter(lane => 
                    !lastLanes.includes(lane)
                );
                const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)] || 0;
                
                notes.push({
                    time: timestamp.time,
                    lane: lane,
                    isChord: false,
                    chordGroup: null
                });
                
                lastLanes = [lane];
            }
        });
        
        return notes.sort((a, b) => a.time - b.time);
    }
    
    // Analyze the rhythm pattern for better chart generation
    analyzeRhythm(timestamps) {
        if (timestamps.length < 3) return null;
        
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i].time - timestamps[i-1].time);
        }
        
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const bpm = 60 / avgInterval;
        
        // Detect common rhythm patterns
        const shortIntervals = intervals.filter(i => i < avgInterval * 0.75).length;
        const longIntervals = intervals.filter(i => i > avgInterval * 1.25).length;
        
        return {
            bpm: Math.round(bpm),
            averageInterval: avgInterval,
            hasVariation: (shortIntervals + longIntervals) / intervals.length > 0.3,
            complexity: intervals.length > 50 ? 'high' : intervals.length > 20 ? 'medium' : 'low'
        };
    }
    
    // Generate charts based on BPM and complexity
    generateAdaptiveChart(timestamps, difficulty, title = 'Untitled') {
        const rhythm = this.analyzeRhythm(timestamps);
        const config = { ...this.difficulties[difficulty] };
        
        if (rhythm) {
            // Adjust difficulty based on BPM
            if (rhythm.bpm > 140) {
                config.chordChance *= 0.7; // Reduce chords for fast songs
                config.minInterval *= 1.2;
            } else if (rhythm.bpm < 100) {
                config.chordChance *= 1.3; // More chords for slow songs
            }
            
            // Adjust for complexity
            if (rhythm.complexity === 'high') {
                config.noteRatio *= 0.9; // Slightly reduce notes for complex rhythms
            }
        }
        
        return this.generateChart(timestamps, difficulty, title);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartGenerator;
}