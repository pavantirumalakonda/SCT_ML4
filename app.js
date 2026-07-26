/**
 * AuraGesture - Frontend Application Logic
 */

// Application Constants
const API_URL = '/api';
const PREDICT_COOLDOWN_MS = 1500; // Cooldown for toggles (Palm, Fist, Index Directions)

// DOM Elements
const elements = {
    // Tabs
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabPanels: document.querySelectorAll('.tab-panel'),
    
    // Sidebar Camera Controls
    webcamFeed: document.getElementById('webcam-feed'),
    captureCanvas: document.getElementById('capture-canvas'),
    gestureOverlay: document.getElementById('gesture-overlay'),
    overlayGestureValue: document.getElementById('overlay-gesture-value'),
    overlayConfidenceValue: document.getElementById('overlay-confidence-value'),
    cameraFallback: document.getElementById('camera-fallback'),
    btnStartCamera: document.getElementById('btn-start-camera'),
    btnTogglePrediction: document.getElementById('btn-toggle-prediction'),
    btnPredictionText: document.getElementById('btn-prediction-text'),
    fpsSlider: document.getElementById('fps-slider'),
    fpsValue: document.getElementById('fps-value'),
    
    // Sidebar Status Panel
    systemStatusDot: document.getElementById('system-status-dot'),
    systemStatusText: document.getElementById('system-status-text'),
    systemLatency: document.getElementById('system-latency'),
    
    // Reference Map Cards
    refCards: document.querySelectorAll('.gesture-card-ref'),
    
    // Media Player Simulator
    simVideo: document.getElementById('sim-video'),
    videoStateBadge: document.getElementById('video-state-badge'),
    videoFeedback: document.getElementById('video-feedback'),
    volLevel: document.getElementById('vol-level'),
    volText: document.getElementById('vol-text'),
    
    // Slide Show Simulator
    carouselTrack: document.getElementById('carousel-track'),
    slides: document.querySelectorAll('.slide'),
    slideStateBadge: document.getElementById('slide-state-badge'),
    carouselDots: document.getElementById('carousel-dots'),
    btnSlidePrev: document.getElementById('btn-slide-prev'),
    btnSlideNext: document.getElementById('btn-slide-next'),
    
    // Analytics
    metricModelName: document.getElementById('metric-model-name'),
    metricAccuracy: document.getElementById('metric-accuracy'),
    metricTrainTime: document.getElementById('metric-train-time'),
    metricInferenceTime: document.getElementById('metric-inference-time'),
    modelsTableBody: document.getElementById('models-table-body'),
    imgConfusionMatrix: document.getElementById('img-confusion-matrix'),
    
    // Upload Tester
    uploadDropZone: document.getElementById('upload-drop-zone'),
    fileInput: document.getElementById('file-input'),
    testerResultsArea: document.getElementById('tester-results-area'),
    imgTestPreview: document.getElementById('img-test-preview'),
    testerPredLabel: document.getElementById('tester-pred-label'),
    testerPredConf: document.getElementById('tester-pred-conf'),
    testerProbabilities: document.getElementById('tester-probabilities')
};

// Application State
let state = {
    cameraStream: null,
    isDetecting: false,
    detectionIntervalId: null,
    fps: 5,
    lastActionTime: 0, // Cooldown tracker
    activeSlideIndex: 0,
    serverActive: false,
    categories: []
};

// --- Core Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initCameraControls();
    initSlideshow();
    initUploader();
    checkServerStatus();
    loadModelMetrics();
    
    // Click simulator slide manual navigation hints
    elements.btnSlidePrev.addEventListener('click', () => changeSlide(-1));
    elements.btnSlideNext.addEventListener('click', () => changeSlide(1));
});

// Check local backend status
async function checkServerStatus() {
    try {
        const res = await fetch(`${API_URL}/status`);
        if (res.ok) {
            const data = await res.json();
            state.serverActive = true;
            state.categories = data.categories;
            updateSystemStatus('active', `Ready: ${data.model_name}`);
            elements.btnTogglePrediction.disabled = false;
        } else {
            throw new Error();
        }
    } catch (e) {
        state.serverActive = false;
        updateSystemStatus('disconnected', 'Server Offline');
        elements.btnTogglePrediction.disabled = true;
    }
}

function updateSystemStatus(status, text) {
    elements.systemStatusText.innerText = text;
    elements.systemStatusDot.className = 'dot';
    
    if (status === 'active') {
        elements.systemStatusDot.classList.add('dot-green');
    } else if (status === 'disconnected') {
        elements.systemStatusDot.classList.add('dot-red');
    } else {
        elements.systemStatusDot.classList.add('dot-yellow');
    }
}

// --- Tab Switching Logic ---
function initTabs() {
    elements.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTabId = btn.getAttribute('data-tab');
            
            // Toggle active classes on buttons
            elements.tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Toggle active classes on panels
            elements.tabPanels.forEach(panel => {
                if (panel.id === targetTabId) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });
        });
    });
}

// --- Webcam Handling ---
function initCameraControls() {
    elements.btnStartCamera.addEventListener('click', startWebcam);
    
    elements.btnTogglePrediction.addEventListener('click', () => {
        if (state.isDetecting) {
            stopDetection();
        } else {
            startDetection();
        }
    });

    elements.fpsSlider.addEventListener('input', (e) => {
        state.fps = parseInt(e.target.value);
        elements.fpsValue.innerText = `${state.fps} Hz`;
        if (state.isDetecting) {
            // Restart with new frequency
            stopDetection();
            startDetection();
        }
    });
}

async function startWebcam() {
    updateSystemStatus('connecting', 'Requesting camera access...');
    try {
        state.cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' }
        });
        
        elements.webcamFeed.srcObject = state.cameraStream;
        elements.cameraFallback.style.display = 'none';
        
        // Let elements refresh
        elements.btnTogglePrediction.disabled = false;
        checkServerStatus();
    } catch (err) {
        console.error("Camera access error:", err);
        updateSystemStatus('disconnected', 'Webcam blocked / missing');
        alert("Unable to access camera. Please verify permission settings.");
    }
}

// --- Real-time Gesture Detection Loop ---
function startDetection() {
    if (!state.cameraStream) return;
    
    state.isDetecting = true;
    elements.btnPredictionText.innerText = "Disable Detection";
    elements.btnTogglePrediction.classList.remove('btn-secondary');
    elements.btnTogglePrediction.classList.add('btn-primary');
    elements.gestureOverlay.style.opacity = "1";
    
    const intervalMs = Math.round(1000 / state.fps);
    state.detectionIntervalId = setInterval(captureAndClassify, intervalMs);
}

function stopDetection() {
    state.isDetecting = false;
    elements.btnPredictionText.innerText = "Enable Detection";
    elements.btnTogglePrediction.classList.remove('btn-primary');
    elements.btnTogglePrediction.classList.add('btn-secondary');
    elements.gestureOverlay.style.opacity = "0.5";
    
    if (state.detectionIntervalId) {
        clearInterval(state.detectionIntervalId);
        state.detectionIntervalId = null;
    }
    
    clearActiveReferenceHighlights();
}

function captureAndClassify() {
    if (!state.cameraStream || elements.webcamFeed.paused || elements.webcamFeed.ended) return;

    const canvas = elements.captureCanvas;
    const context = canvas.getContext('2d');
    
    // Resize internally to save upload bandwidth (e.g. 240x180)
    canvas.width = 240;
    canvas.height = 180;
    
    // Draw mirrored webcam frames
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(elements.webcamFeed, 0, 0, canvas.width, canvas.height);
    context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    
    const base64Image = canvas.toDataURL('image/jpeg', 0.85);
    
    sendPredictionRequest(base64Image);
}

async function sendPredictionRequest(base64Image) {
    const startTime = performance.now();
    try {
        const res = await fetch(`${API_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });
        
        if (res.ok) {
            const data = await res.json();
            const latency = Math.round(performance.now() - startTime);
            elements.systemLatency.innerText = `${latency} ms`;
            
            updateOverlay(data.label, data.confidence);
            highlightReferenceCard(data.label);
            
            // Dispatch gesture events
            handleGestureControl(data.label);
        } else {
            console.error("API error status:", res.status);
        }
    } catch (err) {
        console.error("Prediction fetch failed:", err);
        stopDetection();
        checkServerStatus();
    }
}

// Update floating overlay metrics in camera window
function updateOverlay(label, confidence) {
    elements.overlayGestureValue.innerText = label;
    elements.overlayConfidenceValue.innerText = `Confidence: ${(confidence * 100).toFixed(1)}%`;
    
    // Glowing border effects
    elements.gestureOverlay.className = "overlay-active-glow";
}

function highlightReferenceCard(label) {
    elements.refCards.forEach(card => {
        if (card.getAttribute('data-gesture') === label) {
            card.classList.add('active-gesture-highlight');
        } else {
            card.classList.remove('active-gesture-highlight');
        }
    });
}

function clearActiveReferenceHighlights() {
    elements.refCards.forEach(card => card.classList.remove('active-gesture-highlight'));
    elements.overlayGestureValue.innerText = "None";
    elements.overlayConfidenceValue.innerText = "Confidence: 0%";
}

// --- Gesture Control Simulator Rules ---
function handleGestureControl(gesture) {
    const now = Date.now();
    
    // Volume Control (Continuous, no cooldown needed)
    if (gesture === 'Thumbs Up') {
        adjustVolume(0.04);
        flashOverlayFeedback('🔊+');
        return;
    } else if (gesture === 'Thumbs Down') {
        adjustVolume(-0.04);
        flashOverlayFeedback('🔊-');
        return;
    }
    
    // Cooldown check for toggles/directionals
    if (now - state.lastActionTime < PREDICT_COOLDOWN_MS) return;
    
    if (gesture === 'Palm') {
        toggleVideoPlay();
        state.lastActionTime = now;
    } else if (gesture === 'Fist') {
        toggleVideoMute();
        state.lastActionTime = now;
    } else if (gesture === 'Index Right') {
        changeSlide(1);
        state.lastActionTime = now;
    } else if (gesture === 'Index Left') {
        changeSlide(-1);
        state.lastActionTime = now;
    }
}

// Media Player Methods
function toggleVideoPlay() {
    const video = elements.simVideo;
    if (video.paused) {
        video.play().then(() => {
            elements.videoStateBadge.innerText = "Playing";
            elements.videoStateBadge.className = "action-badge badge-play";
            flashOverlayFeedback('▶️ Play');
        }).catch(err => console.error(err));
    } else {
        video.pause();
        elements.videoStateBadge.innerText = "Paused";
        elements.videoStateBadge.className = "action-badge badge-pause";
        flashOverlayFeedback('⏸️ Pause');
    }
}

function toggleVideoMute() {
    const video = elements.simVideo;
    video.muted = !video.muted;
    if (video.muted) {
        elements.videoStateBadge.innerText = "Muted";
        elements.videoStateBadge.className = "action-badge badge-mute";
        flashOverlayFeedback('🔇 Muted');
    } else {
        elements.videoStateBadge.innerText = "Playing";
        elements.videoStateBadge.className = "action-badge badge-play";
        flashOverlayFeedback('🔊 Unmuted');
    }
}

function adjustVolume(delta) {
    const video = elements.simVideo;
    // Unmute automatically if thumbs adjusted
    if (video.muted && delta > 0) {
        video.muted = false;
        elements.videoStateBadge.innerText = "Playing";
        elements.videoStateBadge.className = "action-badge badge-play";
    }
    
    let vol = video.volume + delta;
    vol = Math.max(0, Math.min(1, vol));
    video.volume = vol;
    
    // Update HTML bars
    elements.volLevel.style.width = `${vol * 100}%`;
    elements.volText.innerText = `${Math.round(vol * 100)}%`;
}

function flashOverlayFeedback(symbol) {
    const feedback = elements.videoFeedback;
    feedback.innerText = symbol;
    feedback.classList.remove('trigger-flash');
    
    // Trigger DOM reflow
    void feedback.offsetWidth;
    feedback.classList.add('trigger-flash');
    
    setTimeout(() => {
        feedback.classList.remove('trigger-flash');
    }, 700);
}

// Presentation Slideshow Methods
function initSlideshow() {
    updateSlideDots();
}

function changeSlide(direction) {
    const slides = elements.slides;
    slides[state.activeSlideIndex].classList.remove('active-slide');
    
    state.activeSlideIndex = (state.activeSlideIndex + direction + slides.length) % slides.length;
    slides[state.activeSlideIndex].classList.add('active-slide');
    
    elements.slideStateBadge.innerText = `Slide ${state.activeSlideIndex + 1}/${slides.length}`;
    updateSlideDots();
    
    // Flash feedback overlay on video container if slide was updated
    flashOverlayFeedback(direction > 0 ? '➡️' : '⬅️');
}

function updateSlideDots() {
    const dotsContainer = elements.carouselDots;
    dotsContainer.innerHTML = '';
    
    for (let i = 0; i < elements.slides.length; i++) {
        const dot = document.createElement('span');
        dot.className = i === state.activeSlideIndex ? 'dot active' : 'dot';
        dotsContainer.appendChild(dot);
    }
}

// --- Model Insights Loader ---
async function loadModelMetrics() {
    try {
        const res = await fetch('metrics.json');
        if (res.ok) {
            const data = await res.json();
            
            // Populate overview boxes
            elements.metricModelName.innerText = data.best_model;
            elements.metricAccuracy.innerText = `${(data.accuracy * 100).toFixed(1)}%`;
            elements.metricTrainTime.innerText = `${data.train_time_sec.toFixed(2)}s`;
            elements.metricInferenceTime.innerText = `${data.inference_time_ms.toFixed(2)}ms`;
            
            // Populate comparison table
            let tableHTML = '';
            for (const [modelName, info] of Object.entries(data.models_comparison)) {
                tableHTML += `
                    <tr>
                        <td><strong>${modelName}</strong></td>
                        <td style="color: var(--accent-success); font-weight: 600;">${(info.accuracy * 100).toFixed(1)}%</td>
                        <td>${info.train_time_sec.toFixed(2)}s</td>
                        <td>${info.inference_time_ms.toFixed(2)} ms/img</td>
                    </tr>
                `;
            }
            elements.modelsTableBody.innerHTML = tableHTML;
            
            // Refresh matrix cache buster
            elements.imgConfusionMatrix.src = `confusion_matrix.png?t=${new Date().getTime()}`;
        }
    } catch (e) {
        console.error("Error loading metrics.json", e);
    }
}

// --- Drag & Drop File Upload Tester ---
function initUploader() {
    const zone = elements.uploadDropZone;
    
    // File search trigger
    zone.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processUploadFile(e.target.files[0]);
        }
    });
    
    // Drag activities
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });
    
    zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
    });
    
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            processUploadFile(e.dataTransfer.files[0]);
        }
    });
}

function processUploadFile(file) {
    if (!file.type.startsWith('image/')) {
        alert("Please upload a valid image file.");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Data = e.target.result;
        
        // Show test image preview frame
        elements.imgTestPreview.src = base64Data;
        elements.testerResultsArea.style.display = 'grid';
        
        // Submit request to endpoint
        elements.testerPredLabel.innerText = "Analyzing...";
        elements.testerPredConf.innerText = "Confidence: -";
        elements.testerProbabilities.innerHTML = '';
        
        try {
            const res = await fetch(`${API_URL}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Data })
            });
            
            if (res.ok) {
                const data = await res.json();
                elements.testerPredLabel.innerText = data.label;
                elements.testerPredConf.innerText = `Confidence: ${(data.confidence * 100).toFixed(1)}%`;
                
                // Display comparison probability list bars
                renderProbabilityBars(data.probabilities, data.label);
            } else {
                elements.testerPredLabel.innerText = "Prediction Error";
            }
        } catch (err) {
            console.error(err);
            elements.testerPredLabel.innerText = "Server Error";
        }
    };
    reader.readAsDataURL(file);
}

function renderProbabilityBars(probs, maxLabel) {
    elements.testerProbabilities.innerHTML = '';
    
    // Sort probabilities descending
    const sortedProbs = Object.entries(probs).sort((a,b) => b[1] - a[1]);
    
    sortedProbs.forEach(([label, value]) => {
        const percentage = (value * 100).toFixed(1);
        const isActive = label === maxLabel;
        const barColor = isActive ? 'var(--accent-primary)' : 'var(--text-muted)';
        
        const probRow = document.createElement('div');
        probRow.className = 'prob-row';
        probRow.innerHTML = `
            <div class="prob-labels">
                <span class="prob-label-name" style="${isActive ? 'color: var(--accent-secondary); font-weight:600' : ''}">${label}</span>
                <span class="prob-label-val">${percentage}%</span>
            </div>
            <div class="prob-track">
                <div class="prob-fill" style="width: ${percentage}%; background-color: ${barColor}"></div>
            </div>
        `;
        elements.testerProbabilities.appendChild(probRow);
    });
}
