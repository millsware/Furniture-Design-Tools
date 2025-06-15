let img = new Image();
let canvas = document.getElementById('drawCanvas');
let ctx = canvas.getContext('2d');
let overallBox = null;
let subBoxes = [];
let drawing = false;
let start = {};
let mode = 'overall'; // 'overall' or 'sub'
let snapThreshold = 10;
let currentSnapPoint = null;
let currentRect = null;

document.getElementById('imgInput').addEventListener('change', function(e) {
    let file = e.target.files[0];
    let reader = new FileReader();
    reader.onload = function(ev) {
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
        }
        img.src = ev.target.result;
    }
    reader.readAsDataURL(file);
    document.getElementById('doneBtn').style.display = 'none';
    overallBox = null;
    subBoxes = [];
    mode = 'overall';
});

canvas.addEventListener('mousedown', function(e) {
    if (!img.src) return;
    drawing = true;
    let rect = canvas.getBoundingClientRect();
    start = {
        x: Math.round(e.clientX - rect.left),
        y: Math.round(e.clientY - rect.top)
    };
    if (mode === 'sub') {
        // Snap start to nearest point if close
        let snap = getSnapPoint(start.x, start.y);
        start.x = snap.x;
        start.y = snap.y;
    }
});

canvas.addEventListener('mousemove', function(e) {
    let rect = canvas.getBoundingClientRect();
    let x = Math.round(e.clientX - rect.left);
    let y = Math.round(e.clientY - rect.top);
    currentSnapPoint = null;

    if (mode === 'sub') {
        let snap = getSnapPoint(x, y);
        if (snap.x !== x || snap.y !== y) {
            currentSnapPoint = snap;
        }
        x = snap.x;
        y = snap.y;
        // Clamp to overall box
        if (overallBox) {
            x = Math.max(overallBox.x1, Math.min(x, overallBox.x2));
            y = Math.max(overallBox.y1, Math.min(y, overallBox.y2));
        }
    }

    if (drawing) {
        currentRect = {
            x1: start.x,
            y1: start.y,
            x2: x,
            y2: y
        };
    } else {
        currentRect = null;
    }
    redraw();
});

canvas.addEventListener('mouseup', function(e) {
    if (!drawing) return;
    currentSnapPoint = null;
    drawing = false;
    currentRect = null; // <-- Add this line
    let rect = canvas.getBoundingClientRect();
    let end = {
        x: Math.round(e.clientX - rect.left),
        y: Math.round(e.clientY - rect.top)
    };
    if (mode === 'sub') {
        let snap = getSnapPoint(end.x, end.y);
        end.x = snap.x;
        end.y = snap.y;
        // Clamp to overall box
        if (overallBox) {
            end.x = Math.max(overallBox.x1, Math.min(end.x, overallBox.x2));
            end.y = Math.max(overallBox.y1, Math.min(end.y, overallBox.y2));
        }
    }
    if (mode === 'overall') {
        overallBox = {
            x1: Math.min(start.x, end.x),
            y1: Math.min(start.y, end.y),
            x2: Math.max(start.x, end.x),
            y2: Math.max(start.y, end.y)
        };
        mode = 'sub';
        document.getElementById('doneBtn').style.display = '';
    } else if (mode === 'sub') {
        let box = {
            x1: Math.min(start.x, end.x),
            y1: Math.min(start.y, end.y),
            x2: Math.max(start.x, end.x),
            y2: Math.max(start.y, end.y)
        };
        // Only add if inside overall box and not overlapping
        if (isInsideOverall(box) && !isOverlapping(box)) {
            subBoxes.push(box);
        }
    }
    redraw();
    showRatios(); // Add this line
});

document.getElementById('doneBtn').onclick = function() {
    // Assign remaining area as the last box
    let remaining = getRemainingBox();
    if (remaining) subBoxes.push(remaining);
    showRatios();
    this.style.display = 'none';
};

function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    if (overallBox) {
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 2;
        ctx.strokeRect(overallBox.x1, overallBox.y1, overallBox.x2 - overallBox.x1, overallBox.y2 - overallBox.y1);
    }
    for (let box of subBoxes) {
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
    }
    // Draw the rectangle being drawn
    if (currentRect) {
        ctx.strokeStyle = (mode === 'overall') ? 'green' : 'blue';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(currentRect.x1, currentRect.y1, currentRect.x2 - currentRect.x1, currentRect.y2 - currentRect.y1);
        ctx.setLineDash([]);
    }
    // Draw snap indicator if active
    if (currentSnapPoint) {
        ctx.beginPath();
        ctx.arc(currentSnapPoint.x, currentSnapPoint.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

function getSnapPoint(x, y) {
    let points = [];
    if (overallBox) {
        points.push(
            {x: overallBox.x1, y: overallBox.y1},
            {x: overallBox.x2, y: overallBox.y1},
            {x: overallBox.x1, y: overallBox.y2},
            {x: overallBox.x2, y: overallBox.y2}
        );
        for (let box of subBoxes) {
            points.push(
                {x: box.x1, y: box.y1},
                {x: box.x2, y: box.y1},
                {x: box.x1, y: box.y2},
                {x: box.x2, y: box.y2}
            );
        }
    }
    for (let pt of points) {
        if (Math.abs(x - pt.x) < snapThreshold && Math.abs(y - pt.y) < snapThreshold) {
            return pt;
        }
    }
    return {x, y};
}

function isInsideOverall(box) {
    if (!overallBox) return false;
    return (
        box.x1 >= overallBox.x1 && box.y1 >= overallBox.y1 &&
        box.x2 <= overallBox.x2 && box.y2 <= overallBox.y2
    );
}

function isOverlapping(newBox) {
    for (let box of subBoxes) {
        if (!(newBox.x2 <= box.x1 || newBox.x1 >= box.x2 ||
              newBox.y2 <= box.y1 || newBox.y1 >= box.y2)) {
            return true;
        }
    }
    return false;
}

function getRemainingBox() {
    // For simplicity, only works if all subBoxes are aligned and non-overlapping
    // For more complex layouts, use a polygon difference algorithm
    if (!overallBox) return null;
    // Example: if only vertical or horizontal splits
    // Here, just return the largest remaining rectangle not covered by subBoxes
    // (You can improve this logic as needed)
    // For now, return null if not implemented
    return null;
}

function showRatios() {
    let output = document.getElementById('output');
    output.innerHTML = '';
    if (!overallBox) return;
    let w = Math.abs(overallBox.x2 - overallBox.x1);
    let h = Math.abs(overallBox.y2 - overallBox.y1);
    output.innerHTML += `<b>Overall Box:</b> ${w} x ${h} (ratio: ${simplifyRatio(w, h)})<br>`;

    // Sub-boxes
    subBoxes.forEach((box, i) => {
        let bw = Math.abs(box.x2 - box.x1);
        let bh = Math.abs(box.y2 - box.y1);
        output.innerHTML += `Sub Box ${i+1}: ${bw} x ${bh} (ratio: ${simplifyRatio(bw, bh)})<br>`;
    });

    // Calculate unique X and Y positions for divisions
    let xPositions = [];
    let yPositions = [];
    subBoxes.forEach(box => {
        xPositions.push(box.x1, box.x2);
        yPositions.push(box.y1, box.y2);
    });
    // Add overall box edges to ensure full coverage
    xPositions.push(overallBox.x1, overallBox.x2);
    yPositions.push(overallBox.y1, overallBox.y2);

    // Get unique, sorted positions
    let uniqueX = Array.from(new Set(xPositions)).sort((a, b) => a - b);
    let uniqueY = Array.from(new Set(yPositions)).sort((a, b) => a - b);

    let horizontalDivisions = uniqueX.length - 1;
    let verticalDivisions = uniqueY.length - 1;

    // Calculate widths for horizontal divisions (side-by-side)
    let widths = [];
    for (let i = 0; i < uniqueX.length - 1; i++) {
        widths.push(uniqueX[i + 1] - uniqueX[i]);
    }
    // Calculate heights for vertical divisions (stacked)
    let heights = [];
    for (let i = 0; i < uniqueY.length - 1; i++) {
        heights.push(uniqueY[i + 1] - uniqueY[i]);
    }

    // Express as ratios
    let widthRatio = simplifyRatioList(widths);
    let heightRatio = simplifyRatioList(heights);

    output.innerHTML += `<br><b>Divisions:</b> ${verticalDivisions} vertical, ${horizontalDivisions} horizontal<br>`;
    output.innerHTML += `Vertical Division Ratios (top to bottom): ${heightRatio}<br>`;
    output.innerHTML += `Horizontal Division Ratios (left to right): ${widthRatio}<br>`;
}

// Helper to simplify a list of numbers as a ratio string
function simplifyRatioList(arr, maxValue = 15, bufferPercent = 0.08) {
    if (arr.length === 0) return '';
    let absArr = arr.map(Math.abs).sort((a, b) => a - b);

    // Group consecutive values within bufferPercent of the smaller value
    let groups = [];
    let currentGroup = [absArr[0]];
    for (let i = 1; i < absArr.length; i++) {
        let prev = currentGroup[currentGroup.length - 1];
        let curr = absArr[i];
        if (Math.abs(curr - prev) / prev <= bufferPercent) {
            currentGroup.push(curr);
        } else {
            groups.push(currentGroup);
            currentGroup = [curr];
        }
    }
    groups.push(currentGroup);

    // Assign each original value to its group average
    let grouped = [];
    let groupAverages = groups.map(g => Math.round(g.reduce((a, b) => a + b, 0) / g.length));
    let idx = 0;
    for (let g = 0; g < groups.length; g++) {
        for (let i = 0; i < groups[g].length; i++) {
            grouped.push(groupAverages[g]);
            idx++;
        }
    }

    // Now simplify as before
    let d = grouped.reduce((a, b) => gcd(a, b));
    let simplified = grouped.map(x => Math.round(x / d));

    // Scale down if any value exceeds maxValue
    let max = Math.max(...simplified);
    if (max > maxValue) {
        let scale = max / maxValue;
        simplified = simplified.map(x => Math.round(x / scale));
        let newGcd = simplified.reduce((a, b) => gcd(a, b));
        simplified = simplified.map(x => x / newGcd);
    }
    return simplified.join(':');
}

function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

function simplifyRatio(a, b, maxValue = 15) {
    a = Math.abs(a);
    b = Math.abs(b);
    let d = gcd(a, b);
    let w = a / d;
    let h = b / d;

    if (Math.max(w, h) > maxValue) {
        let scale = Math.max(w, h) / maxValue;
        w = Math.round(w / scale);
        h = Math.round(h / scale);
        let newGcd = gcd(w, h);
        w = w / newGcd;
        h = h / newGcd;
    }
    return `${w}:${h}`;
}

// Example usage:
let width = box.x2 - box.x1;
let height = box.y2 - box.y1;
let ratio = simplifyRatio(width, height);

canvas.addEventListener('mouseleave', function() {
    currentSnapPoint = null;
    redraw();
});