let imageArray, imageWidth, imageHeight, avgGray, cellArray;

// Default configuration
let config = {
    wall: 0.06,
    res: 10,
    thresh: 0.5,
    mDist: 3,
    mCont: 3,
};

// Emits percent completion or an error
const emitStatus = (percent, error) => {
    postMessage({
        action: 'status',
        pass: {
            error: !!error,
            percent
        }
    });
};

// Take a coordinate and a set of 3+ coordinates to check if point lies within
// pointInPoly, modified - MIT (c) 2016 James Halliday
const pointInPoly = (x, y, vs) => {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        if (((vs[i][1] > y) !== (vs[j][1] > y)) && (x < (vs[j][0] - vs[i][0]) * (y - vs[i][1]) / (vs[j][1] - vs[i][1]) + vs[i][0])) inside = !inside;
    }

    return inside;
};

// Returns ranges of grayscale values rtl then ttb from imageArray
const getRange = (x1, y1, x2, y2) => {
    let xLen = Math.abs(x2 - x1) + 1;
    let xStart = x1 > x2 ? x2 : x1;
    let yLen = Math.abs(y2 - y1) + 1;
    let yStart = y1 > y2 ? y2 : y1;

    let range = new Uint8ClampedArray(xLen * yLen);

    for (let o = 0; o < yLen; o++) {
        for (let i = 0; i < xLen; i++) {
            range[o * xLen + i] = imageArray[(yStart + o) * imageWidth * 4 + (xStart + i) * 4];
        }
    }
    
    return range;
};

// Calculates the average gray value at a fixed resolution
const calcAvgGray = () => {
    const hCells = Math.ceil(imageHeight / config.res), wCells = Math.ceil(imageWidth / config.res);
    let fMatrix, sum, divisor;
    avgGray = new Uint8ClampedArray(hCells * wCells);

    for (let i = 0; i < avgGray.length; i++) {
        let x = (i % wCells) * config.res, y = (i - i % wCells) / wCells * config.res;
        fMatrix = getRange(x, y, x + config.res - 1, y + config.res - 1);

        sum = 0;
        divisor = 0;

        for (let u in fMatrix) {
            if (typeof fMatrix[u] !== 'undefined') {
                sum += fMatrix[u];
                divisor++;
            }
        }
            
        avgGray[i] = Math.round(sum / divisor);
    }
};

// Gets the average gray value for a certain coordinate
const getAverage = (i) => {
    let wCells = Math.ceil(imageWidth / config.res);
    let cidx = Math.floor((i - i % imageWidth) / imageWidth / config.res) * wCells + Math.floor(i % imageWidth / config.res);

    return avgGray[cidx];
};

// Gets the contrast of a point against the localized average
const getContrast = (i) => (imageArray[i] - getAverage(i / 4));

// Serializes an image to grayscale
const Serialize = ({data, height, width}) => {
    imageArray = new Uint8ClampedArray(data.length);
    imageWidth = width;
    imageHeight = height;

    for (let i = 0; i < data.length; i += 4) {
        let avg = Math.round((data[i] + data[i + 1] + data[i + 2])/3);

        imageArray[i] = avg;
        imageArray[i + 1] = avg;
        imageArray[i + 2] = avg;
        imageArray[i + 3] = 255;
    }

    postMessage({
        action: 'serialized',
        pass: {
            data: imageArray,
            height: height,
            width: width
        }
    });
};

// Cuts off unused parts of an image for visual confirmation
const Rectangulate = (points) => {
    let newImage = new Uint8ClampedArray(imageArray.length);
    newImage.set(imageArray);

    for (let i = 0; i < newImage.length; i += 4) {
        let x = (i % (4 * imageWidth)) / 4;
        let y = (i - 4 * x) / imageWidth / 4;

        if (!pointInPoly(x, y, points)) {
            newImage[i] = 0;
            newImage[i + 1] = 0;
            newImage[i + 2] = 0;
        }
    }

    postMessage({
        action: 'rectangulated',
        pass: {
            data: newImage,
            height: imageHeight,
            width: imageWidth
        }
    });
};

// Recursively undetects areas adjoined to initial point
/*
const DestroyAround = (i) => {
    if (cellArray[i] === 1) {
        cellArray[i] = 0;
        if (cellArray[i - 1] === 1) {
            DestroyAround(i - 1);
        }
        if (cellArray[i + 1] === 1) {
            DestroyAround(i + 1);
        }
        if (cellArray[i - imageWidth] === 1) {
            DestroyAround(i - imageWidth);
        }
        if (cellArray[i + imageWidth] === 1) {
            DestroyAround(i + imageWidth);
        }
    }
};
*/

// Detects high contrast areas
const Detect = (points) => {
    calcAvgGray();

    emitStatus(0.1);

    cellArray = new Uint8Array(imageArray.length / 4);
    let arrayCopy = new Uint8ClampedArray(imageArray.length);
    arrayCopy.set(imageArray);

    // Do initial detection
    for (let i = 0; i < imageArray.length; i += 4) {
        let x = (i % (4 * imageWidth)) / 4;
        let y = (i - 4 * x) / imageWidth / 4;

        if (i % 80000 === 0) emitStatus(0.4 * i / imageArray.length + 0.1);

        if (pointInPoly(x, y, points) && getContrast(i) <= -1 * config.mCont) {
            cellArray[i / 4] = 1;
        } else {
            cellArray[i / 4] = 0;
        }
    }

    emitStatus(0.5);

    let sideLengths = points.map((p1, idx) => {
        let p2 = idx === 3 ? points[0] : points[idx + 1];
        return Math.pow(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2), 0.5);
    });

    let sideMargin = Math.round(sideLengths.reduce((a, b) => {
        if (b < a) a = b;
        return a;
    }, sideLengths[0]) * config.wall);

    // Remove detection of walls
    for (let i in cellArray) {
        let x = i % imageWidth;
        let y = (i - x) / imageWidth;

        if (i % 20000 === 0) emitStatus(0.375 * i / cellArray.length + 0.5);

        if (
            pointInPoly(x, y, points) && 
            (!pointInPoly(x, y + sideMargin, points)
            || !pointInPoly(x, y - sideMargin, points)
            || !pointInPoly(x - sideMargin, y, points)
            || !pointInPoly(x + sideMargin, y, points))
        ) {
            // DestroyAround(i);
            cellArray[i] = 0;
        }
    }

    emitStatus(0.875);

    // Add color for detection
    for (let i in cellArray) {
        if (i % 100000 === 0) emitStatus(0.125 * i / cellArray.length + 0.875);

        if (cellArray[i] === 1) {
            imageArray[i * 4] = 242;
            imageArray[i * 4 + 1] = 46;
            imageArray[i * 4 + 2] = 36;
        }
    }

    postMessage({
        action: 'detected',
        pass: {
            data: imageArray,
            height: imageHeight,
            width: imageWidth
        }
    });

    imageArray.set(arrayCopy);
};

// Generates the coordinates of a diamond of certain distance around a point
const DiamondCoords = (i, distance) => {
    let coords = [];
    i = Number(i);
    for (let o = -distance; o <= distance; o++) {
        for (let u = -distance; u <= distance; u++) {
            if (Math.abs(o) + Math.abs(u) <= distance) {
                coords.push(i + o * imageWidth + u);
            }
        }
    }
    return coords;
};

// Calculates the maximum diamond that could encapsule a point with a certain tolerance
const MaxDiamond = (i, distance) => {
    if (!distance) distance = 1;
    i = Number(i);
    let coords = DiamondCoords(i, distance);
    //1 5 13 25 41
    let internalPoints = 2 * Math.pow(distance, 2) - 2 * distance + 1;
    let deltaPoints = 4 * distance;

    let detectedPoints = 0;

    for (let a in coords) {
        if (typeof cellArray[coords[a]] === 'number' && cellArray[coords[a]] === 1) {
            detectedPoints++;
        }
    }

    if ((detectedPoints - internalPoints)/deltaPoints >= config.thresh) return MaxDiamond(i, distance + 1);
    return distance;
};

// Count the diamond structures encapsulating the high contrast regions
const DiamondCount = (points) => {
    let count = 0;

    let arrayCopy = new Uint8Array(cellArray.length);
    arrayCopy.set(cellArray);
    let arrayCopyTwo = new Uint8Array(imageArray.length);
    arrayCopyTwo.set(imageArray);

    for (let i in cellArray) {
        i = Number(i);
        if (cellArray[i] === 1) {
            let distance = MaxDiamond(i, 1);
            if (distance >= config.mDist) {
                count++;
                let coords = DiamondCoords(i, distance);
                for (let o in coords) {
                    cellArray[coords[o]] = 0;
                }
                imageArray[i*4] = 0;
                imageArray[i*4 + 1] = 0;
                imageArray[i*4 + 2] = 0;
                imageArray[i*4 + 4] = 255;
                imageArray[i*4 + 5] = 255;
                imageArray[i*4 + 6] = 0;
            }
        }
    }

    cellArray.set(arrayCopy);

    postMessage({
        action: 'counted',
        pass: {
            data: imageArray,
            height: imageHeight,
            width: imageWidth,
            count
        }
    });

    imageArray.set(arrayCopyTwo);
};

// Respond to messages from the main thread
onmessage = ({data}) => {
    console.log('Running action:', data.action);
    try {
        if (data.action === 'serialize') {
            Serialize(data.pass);
        } else if (data.action === 'rectangulate') {
            Rectangulate(data.pass);
        } else if (data.action === 'detect') {
            Detect(data.pass);
        } else if (data.action === 'count') {
            DiamondCount(data.pass);
        } else if (data.action === 'config') {
            config = {...config, ...data.pass};
            console.log('Config:', config);
        } else if (data.action === 'copy') {
            postMessage({
                action: 'serialized',
                pass: {
                    data: imageArray,
                    height: imageHeight,
                    width: imageWidth
                }
            });
        }
    } catch (e) {
        console.error(e);
        emitStatus(0, true);
    }
    console.log('Finished action:', data.action);
};