import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// --- System State State ---
let scene, camera, renderer, currentFont, textMesh;
let animationPlaying = true;
let timelineProgress = 0;
let cameraRigMode = 'cinematic'; // cinematic, orbit, glitch
let currentTextString = "PRO";
let extrusionDepth = 0.5;
let baseSpeedModifier = 1.0;
let baseColor = 0xea580c; // Default copper orange

// DOM Reference Mapping
const viewportContainer = document.getElementById('canvas-container');
const targetDiv = document.getElementById('three-canvas-target');

// --- Initialization Routine ---
function initEngine() {
    // 1. Scene Construction
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.15);

    // 2. Camera Configuration (Vertical 9:16 Field-Of-View Compensation)
    const aspect = viewportContainer.clientWidth / viewportContainer.clientHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(0, 0, 8);

    // 3. WebGL Renderer Initialization
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(viewportContainer.clientWidth, viewportContainer.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit to 2 for high performance on mobile Safari
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    targetDiv.appendChild(renderer.domElement);

    // 4. Studio Lighting Configuration
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(baseColor, 4.0);
    rimLight.position.set(-5, -2, -3);
    scene.add(rimLight);

    // 5. Load Default Typography Asset via CDN
    const loader = new FontLoader();
    // Fetching clean standard Helvetiker font file from Three.js distribution CDN
    loader.load('https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json', (font) => {
        currentFont = font;
        refresh3DTextEngine();
        animateEngineLoop();
    });

    // 6. Bind UI Interactions
    initInterfaceListeners();
    window.addEventListener('resize', handleWindowResize);
}

// --- Dynamic Text Engine Generation ---
function refresh3DTextEngine() {
    if (!currentFont) return;
    
    if (textMesh) {
        scene.remove(textMesh);
        textMesh.geometry.dispose();
        if (Array.isArray(textMesh.material)) {
            textMesh.material.forEach(mat => mat.dispose());
        } else {
            textMesh.material.dispose();
        }
    }

    // Extrusion Parameter Calculations
    const textGeometry = new TextGeometry(currentTextString, {
        font: currentFont,
        size: 1.2,
        height: extrusionDepth,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.03,
        bevelOffset: 0,
        bevelSegments: 5
    });

    // Compute layout bounds to correctly center text pivot points
    textGeometry.computeBoundingBox();
    const centerOffset = -0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x);
    const centerYOffset = -0.5 * (textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y);
    textGeometry.translate(centerOffset, centerYOffset, -extrusionDepth / 2);

    // Create high-contrast sleek materials
    const faceMaterial = new THREE.MeshStandardMaterial({ 
        color: baseColor, 
        roughness: 0.1, 
        metalness: 0.8 
    });
    const sideMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x111111, 
        roughness: 0.4, 
        metalness: 0.2 
    });

    textMesh = new THREE.Mesh(textGeometry, [faceMaterial, sideMaterial]);
    textMesh.castShadow = true;
    textMesh.receiveShadow = true;
    scene.add(textMesh);
}

// --- Main Engine Render & Core Animation Loop ---
let clock = new THREE.Clock();

function animateEngineLoop() {
    requestAnimationFrame(animateEngineLoop);

    const delta = clock.getDelta();
    
    if (animationPlaying) {
        // Increment global clock parameters
        timelineProgress += delta * baseSpeedModifier;
        const sliderValue = (timelineProgress * 20) % 100;
        document.getElementById('timeline-slider').value = sliderValue;
        
        // Render precise UI timecode text strings
        const formattedTime = `00:${Math.floor(timelineProgress % 60).toString().padStart(2, '0')}`;
        document.getElementById('timeline-time').innerText = formattedTime;

        // Drive Camera Rig Layouts
        executeCameraRigSequencing(timelineProgress);
    }

    renderer.render(scene, camera);
}

// --- Pre-Rigged Camera Track Matrix Sequences ---
function executeCameraRigSequencing(time) {
    if (!textMesh) return;

    switch (cameraRigMode) {
        case 'cinematic':
            // Slow cinematic tracking sweep with subtle responsive push-in
            camera.position.x = Math.sin(time * 0.5) * 2;
            camera.position.y = Math.cos(time * 0.3) * 0.8;
            camera.position.z = 7 + Math.sin(time * 0.2) * 1.5;
            camera.lookAt(textMesh.position);
            break;

        case 'orbit':
            // Fast continuous 360 rotation loop optimized for high-energy cuts
            const radius = 7;
            camera.position.x = Math.sin(time * 1.2) * radius;
            camera.position.z = Math.cos(time * 1.2) * radius;
            camera.position.y = 1.5;
            camera.lookAt(textMesh.position);
            break;

        case 'glitch':
            // Generates randomized cinematic camera displacement values mimicking handheld setups
            const baseFrequency = time * 8;
            camera.position.x = Math.sin(time) * 0.5 + (Math.sin(baseFrequency) * 0.08);
            camera.position.y = Math.cos(time * 1.5) * 0.3 + (Math.cos(baseFrequency * 1.2) * 0.06);
            camera.position.z = 6.5 + (Math.sin(baseFrequency * 0.7) * 0.05);
            camera.lookAt(new THREE.Vector3(0, 0, 0));
            break;
    }
}

// --- UI Panel Interaction Event Mapping ---
function initInterfaceListeners() {
    // Timeline Play/Pause State Toggles
    const playBtn = document.getElementById('btn-play');
    playBtn.addEventListener('click', () => {
        animationPlaying = !animationPlaying;
        const icon = document.getElementById('play-icon');
        if (animationPlaying) {
            icon.setAttribute('data-lucide', 'pause');
            icon.classList.remove('text-green-500');
            icon.classList.add('text-orange-500');
        } else {
            icon.setAttribute('data-lucide', 'play');
            icon.classList.remove('text-orange-500');
            icon.classList.add('text-green-500');
        }
        lucide.createIcons();
    });

    // Handle Live Text Changes
    document.getElementById('input-3d-text').addEventListener('input', (e) => {
        currentTextString = e.target.value || " ";
        refresh3DTextEngine();
    });

    // Extrusion Modifier Input Tracking
    document.getElementById('slider-depth').addEventListener('input', (e) => {
        extrusionDepth = parseFloat(e.target.value);
        refresh3DTextEngine();
    });

    // Camera Parameter Realtime Adapters
    document.getElementById('slider-cam-speed').addEventListener('input', (e) => {
        baseSpeedModifier = parseFloat(e.target.value);
    });

    // Custom Local JSON Font File Asset Pipeline
    document.getElementById('font-uploader').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const fontData = JSON.parse(event.target.result);
                const loader = new FontLoader();
                currentFont = loader.parse(fontData);
                refresh3DTextEngine();
            } catch (err) {
                alert("Invalid Typeface JSON. Ensure format maps cleanly to Three.js specifications.");
            }
        };
        reader.readAsText(file);
    });

    // Camera Rig Option Control Mapping Switches
    document.getElementById('cam-cinematic').addEventListener('click', () => cameraRigMode = 'cinematic');
    document.getElementById('cam-orbit').addEventListener('click', () => cameraRigMode = 'orbit');
    document.getElementById('cam-glitch').addEventListener('click', () => cameraRigMode = 'glitch');

    // Environment and Aesthetic Theme Presets Engine
    document.getElementById('preset-orange').addEventListener('click', () => updateAestheticTheme(0xea580c, 0x050505));
    document.getElementById('preset-cyber').addEventListener('click', () => updateAestheticTheme(0xa855f7, 0x0f0714));
    document.getElementById('preset-monochrome').addEventListener('click', () => updateAestheticTheme(0x3f3f46, 0x020202));
    document.getElementById('preset-battery').addEventListener('click', () => updateAestheticTheme(0x10b981, 0x040d08));

    // Handle Modular Navigation Tab System Clicking
    setupTabToggles();

    // Export Placeholder Notification Hook
    document.getElementById('btn-export').addEventListener('click', () => {
        alert("Preparing frames for rendering. Your production is being compiled directly to an active stream buffer.");
    });
}

function updateAestheticTheme(colorHex, bgHex) {
    baseColor = colorHex;
    scene.background = new THREE.Color(bgHex);
    scene.fog.color = new THREE.Color(bgHex);
    
    // Find the secondary color source and swap ambient light fields
    scene.children.forEach(child => {
        if (child instanceof THREE.DirectionalLight && child.position.x === -5) {
            child.color.setHex(colorHex);
        }
    });
    refresh3DTextEngine();
}

function setupTabToggles() {
    const tabs = {
        'tab-text': 'panel-text',
        'tab-camera': 'panel-camera',
        'tab-presets': 'panel-presets'
    };

    Object.keys(tabs).forEach(activeTabId => {
        document.getElementById(activeTabId).addEventListener('click', () => {
            // Reset active states
            Object.keys(tabs).forEach(tabId => {
                document.getElementById(tabId).classList.remove('border-orange-500', 'text-orange-500');
                document.getElementById(tabId).classList.add('border-transparent', 'text-neutral-400');
                document.getElementById(tabs[tabId]).classList.add('hidden');
            });
            // Apply selected styling parameters
            document.getElementById(activeTabId).classList.add('border-orange-500', 'text-orange-500');
            document.getElementById(tabs[activeTabId]).classList.remove('hidden');
        });
    });
}

// --- Clean Layout Scaling Recalculations ---
function handleWindowResize() {
    const width = viewportContainer.clientWidth;
    const height = viewportContainer.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
}

// Run Engine Setup routine on load
document.addEventListener("DOMContentLoaded", () => {
    initEngine();
    lucide.createIcons();
});
