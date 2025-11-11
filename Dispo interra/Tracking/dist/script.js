import {
    HandLandmarker,
    FilesetResolver,
    DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

const video = document.querySelector("#webcam");
const canvasLandmarks = document.querySelector("#canvasLandmarks");
const ctxLandmarks = canvasLandmarks.getContext('2d');

const canvasDraw = document.querySelector("#canvasDraw");
const ctxDraw = canvasDraw.getContext('2d');

const track = document.querySelector("#track");
track.disabled = true;

let handLandmarker = null;
let can_predict = 0;
let drawingUtils = null;

const createHandLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
    });
    can_predict += 1;
    if (can_predict === 2) track.disabled = false;
};

const init = () => {
    navigator.mediaDevices.getUserMedia({ audio: false, video: true })
        .then((stream) => {
            video.srcObject = stream;
            return new Promise((resolve) => { video.onloadeddata = resolve; });
        })
        .then(() => {
            const width = video.getAttribute('width');
            const height = Math.floor(width * video.videoHeight / video.videoWidth);
            video.setAttribute('height', height);
            video.parentNode.style.height = height + 'px';

            // adapter taille des canvas à la vidéo
            [canvasLandmarks, canvasDraw].forEach(c => {
                c.setAttribute('width', video.width);
                c.setAttribute('height', video.height);
            });

            video.play();
            can_predict += 1;
            if (can_predict === 2) track.disabled = false;
        })
        .catch((e) => console.warn(e));

    createHandLandmarker();
    drawingUtils = new DrawingUtils(ctxLandmarks);
};

let lastVideoTime = -1;
let results = null;
let startTimeMs = -1;
let lastPositions = { Left: null, Right: null };

// Remplacer / coller dans ton JS
function extractHandedness(results, index) {
    const h = results?.handednesses?.[index];
    if (!h) return undefined;

    // cas fréquent : handednesses = [ [ { categoryName: "Right", ... } ], ... ]
    if (Array.isArray(h) && h[0]) {
        if (h[0].categoryName) return h[0].categoryName;
        if (h[0].displayName) return h[0].displayName;
        if (h[0].label) return h[0].label;
    }

    // cas : handednesses = [ { categories: [ { categoryName: "Left" } ] }, ... ]
    if (h.categories && Array.isArray(h.categories) && h.categories[0]) {
        if (h.categories[0].categoryName) return h.categories[0].categoryName;
        if (h.categories[0].label) return h.categories[0].label;
    }

    // cas direct (peu probable mais safe)
    if (h.categoryName) return h.categoryName;
    if (h.displayName) return h.displayName;

    return undefined;
}

function drawWithFingers(results) {
    const mainRaw = (document.querySelector("#mains")?.value || "Right").trim();
    const main = mainRaw.toLowerCase(); // 'left' ou 'right'
    const rayon = parseInt(document.querySelector("#rayon")?.value) || 5;
    const couleur = document.querySelector("#couleur")?.value || "#000000";

    if (!results || !results.landmarks) {
        // utile pour debug si nécessaire
        // console.log("no results or landmarks", results);
        return;
    }

    // détecte automatiquement si l'élément parent est en miroir CSS (scaleX(-1) ou matrix(-1,...))
    const parentTransform = getComputedStyle(video.parentNode || document.documentElement).transform || "";
    const mirrored = parentTransform.includes("matrix(-1") || parentTransform.includes("scaleX(-1)");

    for (let i = 0; i < results.landmarks.length; i++) {
        const handLandmarks = results.landmarks[i];
        // use robust extractor:
        let handedness = extractHandedness(results, i);
        if (!handedness) {
            // debug minimal si jamais
            // console.log("Can't get handedness for index", i, results.handednesses);
            continue;
        }

        // normalize and optionally invert if mirrored
        let hnorm = String(handedness).trim().toLowerCase(); // 'left' / 'right'
        if (mirrored) {
            if (hnorm === "left") hnorm = "right";
            else if (hnorm === "right") hnorm = "left";
        }

        if (hnorm !== main) continue; // on ne dessine que pour la main sélectionnée

        const indexTip = handLandmarks[8];
        if (!indexTip) continue;

        const x = indexTip.x * canvasDraw.width;
        const y = indexTip.y * canvasDraw.height;

        if (lastPositions[hnorm]) {
            const { x: lastX, y: lastY } = lastPositions[hnorm];
            ctxDraw.beginPath();
            ctxDraw.moveTo(lastX, lastY);
            ctxDraw.lineTo(x, y);
            ctxDraw.strokeStyle = couleur;
            ctxDraw.lineWidth = rayon;
            ctxDraw.lineCap = "round";
            ctxDraw.stroke();
            ctxDraw.closePath();
        }

        lastPositions[hnorm] = { x, y };
    }
}

const predict = () => {
    startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        results = handLandmarker.detectForVideo(video, startTimeMs);
    }

    ctxLandmarks.save();
    ctxLandmarks.clearRect(0, 0, canvasLandmarks.width, canvasLandmarks.height);

    if (results.landmarks) {
        for (const landmarks of results.landmarks) {
            let indexL = [landmarks[5], landmarks[6], landmarks[7], landmarks[8]];
            drawingUtils.drawConnectors(indexL, HandLandmarker.HAND_CONNECTIONS, {
                color: "#00FF00",
                lineWidth: 4
            });
            drawingUtils.drawLandmarks(indexL, { color: "#FF0000", lineWidth: 1 });
        }

        // dessin en continu
        drawWithFingers(results);
        console.log("Dessin avec les doigts...");
    }

    ctxLandmarks.restore();
    requestAnimationFrame(predict);
};
toggleVideo.addEventListener('click', () => {
    if (video.style.display === "none") {
        video.style.display = "block";
        toggleVideo.textContent = "Masquer vidéo";
    } else {
        video.style.display = "none";
        toggleVideo.textContent = "Afficher vidéo";
    }
});
const canvasContainer = document.getElementById('canvasContainer');
const canvasBg = document.getElementById('canvasbg');
const fullscreenBtn = document.getElementById('fullscreenBtn');

fullscreenBtn.addEventListener('click', () => {
    if (canvasContainer.requestFullscreen) {
        canvasContainer.requestFullscreen();
    }
    resizeCanvases();
});

window.addEventListener('resize', resizeCanvases);

function resizeCanvases() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Met à jour la taille des canvas
    [canvasBg, canvasLandmarks, canvasDraw].forEach(c => {
        c.width = w;
        c.height = h;
        c.style.width = w + 'px';
        c.style.height = h + 'px';
    });

    // Met à jour la vidéo
    video.width = w;
    video.height = h;
    video.style.width = w + 'px';
    video.style.height = h + 'px';
}

// avoir constamment la couleur de fond du canvas de dessin
// synchronisée avec la valeur du sélecteur de couleur
const bgColor = document.getElementById('bgColor');
canvasbg.style.backgroundColor = bgColor.value || "#000000";
bgColor.addEventListener('input', (evt) => {
    const color = evt.target.value || "#000000";
    canvasbg.style.backgroundColor = color;
});

track.addEventListener('click', () => {
    track.disabled = true;
    predict();
});

init();
