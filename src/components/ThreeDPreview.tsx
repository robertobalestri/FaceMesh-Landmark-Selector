import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { TRIANGULATION } from '../utils/triangulation';
import type { SelectionGroup } from './Sidebar';

const MESH_SCALE = 3.0;

interface ThreeDPreviewProps {
    landmarks: NormalizedLandmark[] | null;
    groups: SelectionGroup[];
    activeGroupId: string;
    offsets: Record<number, { dx: number, dy: number }>;
    imageSrc: string | null;
    imageSize: { width: number; height: number } | null;
}

export const ThreeDPreview: React.FC<ThreeDPreviewProps> = ({
    landmarks,
    groups,
    activeGroupId,
    offsets,
    imageSrc,
    imageSize
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const sceneRef = useRef<THREE.Scene | null>(null);
    const geometryRef = useRef<THREE.BufferGeometry | null>(null);
    const textureRef = useRef<THREE.Texture | null>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
    const spheresGroupRef = useRef<THREE.Group | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

    // 1. Initial Scene Setup
    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#121212');
        sceneRef.current = scene;

        const initialWidth = containerRef.current.clientWidth || 1;
        const initialHeight = containerRef.current.clientHeight || 1;

        const camera = new THREE.PerspectiveCamera(
            45,
            initialWidth / initialHeight,
            0.01,
            100
        );
        camera.position.set(0, 0, 3);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            antialias: true
        });
        renderer.setSize(initialWidth, initialHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controlsRef.current = controls;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(0, 5, 5);
        scene.add(dirLight);

        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
        dirLight2.position.set(0, -5, -5);
        scene.add(dirLight2);

        // Group for selection highlight spheres
        const spheresGroup = new THREE.Group();
        scene.add(spheresGroup);
        spheresGroupRef.current = spheresGroup;

        // Geometry & Material
        const geometry = new THREE.BufferGeometry();
        geometryRef.current = geometry;

        // Create a 1x1 solid white texture placeholder to prevent WebGL lazy initialization warnings
        const placeholderTexture = new THREE.DataTexture(
            new Uint8Array([255, 255, 255, 255]),
            1,
            1,
            THREE.RGBAFormat
        );
        placeholderTexture.needsUpdate = true;
        textureRef.current = placeholderTexture;

        const material = new THREE.MeshStandardMaterial({
            map: placeholderTexture,
            roughness: 0.6,
            metalness: 0.1,
            side: THREE.DoubleSide,
            flatShading: false
        });
        materialRef.current = material;

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // Animation Loop
        let animationFrameId: number;
        const animate = () => {
            controls.update();
            renderer.render(scene, camera);
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();

        // Resize Observer for robust container resize handling
        const resizeObserver = new ResizeObserver(() => {
            if (!containerRef.current) return;
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            if (width <= 0 || height <= 0) return; // Prevent 0x0 / NaN aspect ratios
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            cancelAnimationFrame(animationFrameId);
            resizeObserver.disconnect();
            controls.dispose();
            renderer.dispose();
            geometry.dispose();
            material.dispose();
            if (textureRef.current) textureRef.current.dispose();
        };
    }, []);

    // 2. Texture Loading
    useEffect(() => {
        if (!imageSrc) return;

        const loader = new THREE.TextureLoader();
        loader.load(imageSrc, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            if (materialRef.current) {
                materialRef.current.map = texture;
                materialRef.current.needsUpdate = true;
            }
            if (textureRef.current) {
                textureRef.current.dispose();
            }
            textureRef.current = texture;
        });
    }, [imageSrc]);

    // 3. Geometry and Vertices Update
    useEffect(() => {
        if (!landmarks || landmarks.length === 0 || !geometryRef.current) return;

        const imgW = imageSize?.width || 1;
        const imgH = imageSize?.height || 1;
        const aspect = imgW / imgH;

        // Standard face mesh surface contains the first 468 vertices
        const vertexCount = Math.min(landmarks.length, 468);
        const positions = new Float32Array(vertexCount * 3);
        const uvs = new Float32Array(vertexCount * 2);

        // Calculate face centroid to keep the mesh centered in the WebGL scene
        let sumX = 0, sumY = 0, sumZ = 0;
        for (let i = 0; i < vertexCount; i++) {
            const l = landmarks[i];
            const off = offsets[i] || { dx: 0, dy: 0 };
            sumX += l.x + (off.dx / imgW);
            sumY += l.y + (off.dy / imgH);
            sumZ += l.z;
        }
        const cx = sumX / vertexCount;
        const cy = sumY / vertexCount;
        const cz = sumZ / vertexCount;

        for (let i = 0; i < vertexCount; i++) {
            const l = landmarks[i];
            const off = offsets[i] || { dx: 0, dy: 0 };

            // Apply offsets in normalized space
            const nx = l.x + (off.dx / imgW);
            const ny = l.y + (off.dy / imgH);

            // Centered 3D coordinates relative to face centroid, scaled up
            positions[i * 3 + 0] = (nx - cx) * aspect * MESH_SCALE;
            positions[i * 3 + 1] = -(ny - cy) * MESH_SCALE; // Invert Y (2D Y-down to 3D Y-up)
            positions[i * 3 + 2] = -(l.z - cz) * aspect * MESH_SCALE; // Invert Z (Z-out)

            // UV mapping: map original normalized landmark coordinates
            uvs[i * 2 + 0] = l.x;
            uvs[i * 2 + 1] = 1.0 - l.y;
        }

        const geometry = geometryRef.current;
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

        if (!geometry.index) {
            geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(TRIANGULATION), 1));
        }

        geometry.computeVertexNormals();
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.uv.needsUpdate = true;
    }, [landmarks, offsets, imageSize]);

    // 4. Update Selection Highlight Spheres (supports all 478 points, including pupils)
    useEffect(() => {
        const spheresGroup = spheresGroupRef.current;
        if (!spheresGroup || !landmarks) return;

        // Clear previous spheres and dispose of resources
        while (spheresGroup.children.length > 0) {
            const obj = spheresGroup.children[0];
            spheresGroup.remove(obj);
            if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        }

        const imgW = imageSize?.width || 1;
        const imgH = imageSize?.height || 1;
        const aspect = imgW / imgH;

        // Calculate same face centroid to position spheres correctly
        const vertexCount = Math.min(landmarks.length, 468);
        let sumX = 0, sumY = 0, sumZ = 0;
        for (let i = 0; i < vertexCount; i++) {
            const l = landmarks[i];
            const off = offsets[i] || { dx: 0, dy: 0 };
            sumX += l.x + (off.dx / imgW);
            sumY += l.y + (off.dy / imgH);
            sumZ += l.z;
        }
        const cx = sumX / vertexCount;
        const cy = sumY / vertexCount;
        const cz = sumZ / vertexCount;

        const activeGroup = groups.find(g => g.id === activeGroupId);
        if (!activeGroup || !activeGroup.visible) return;

        const sphereColor = activeGroup.color || '#bb86fc';
        const sphereGeo = new THREE.SphereGeometry(0.0025 * MESH_SCALE, 8, 8);
        const sphereMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(sphereColor),
            toneMapped: false
        });

        activeGroup.indices.forEach(idx => {
            if (idx >= landmarks.length) return;
            const l = landmarks[idx];
            const off = offsets[idx] || { dx: 0, dy: 0 };

            const nx = l.x + (off.dx / imgW);
            const ny = l.y + (off.dy / imgH);

            const x = (nx - cx) * aspect * MESH_SCALE;
            const y = -(ny - cy) * MESH_SCALE;
            const z = -(l.z - cz) * aspect * MESH_SCALE;

            const sphere = new THREE.Mesh(sphereGeo, sphereMat);
            sphere.position.set(x, y, z);
            spheresGroup.add(sphere);
        });
    }, [landmarks, groups, activeGroupId, offsets, imageSize]);

    return (
        <div
            ref={containerRef}
            className="three-preview-container"
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#121212'
            }}
        >
            <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
            {!landmarks && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#121212',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#888',
                        zIndex: 2,
                        fontFamily: 'Inter, sans-serif'
                    }}
                >
                    <h3 style={{ margin: 0, color: '#bb86fc' }}>WebGL 3D Viewport</h3>
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem' }}>Awaiting FaceMesh landmarks detection...</p>
                </div>
            )}
        </div>
    );
};
