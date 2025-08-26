// Extract timestamps from kuroneko_extreme.json
const fs = require('fs');
const path = require('path');

// Read the kuroneko_extreme.json file
const filePath = '/Users/hayatoikeda/Downloads/kuroneko_extreme.json';
const chartData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Extract unique timestamps and sort them
const timestamps = [...new Set(chartData.notes.map(note => note.time))].sort((a, b) => a - b);

console.log(`Found ${timestamps.length} unique timestamps:`);
console.log('Raw timestamps (in seconds):');
console.log(timestamps.join('\n'));

console.log('\n\nFormatted for chart editor:');
const formattedTimestamps = timestamps.map(time => ({
    time: time,
    formattedTime: `${Math.floor(time / 60)}:${(time % 60).toFixed(3).padStart(6, '0')}`
}));

formattedTimestamps.forEach((timestamp, index) => {
    console.log(`${index + 1}: ${timestamp.formattedTime} (${timestamp.time}s)`);
});

// Save to a simple text file for easy copying
const outputPath = '/Users/hayatoikeda/Desktop/開発/otogame_2/kuroneko_timestamps.txt';
fs.writeFileSync(outputPath, timestamps.join('\n'), 'utf8');
console.log(`\nTimestamps saved to: ${outputPath}`);

// Also save as JSON for the chart editor
const editorFormat = {
    title: 'kuroneko',
    timestamps: timestamps.map(time => ({ time })),
    metadata: {
        totalTimestamps: timestamps.length,
        extractedAt: new Date().toISOString(),
        source: 'kuroneko_extreme.json'
    }
};

const jsonOutputPath = '/Users/hayatoikeda/Desktop/開発/otogame_2/kuroneko_timestamps.json';
fs.writeFileSync(jsonOutputPath, JSON.stringify(editorFormat, null, 2), 'utf8');
console.log(`Chart editor format saved to: ${jsonOutputPath}`);