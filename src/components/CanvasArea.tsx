
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { SelectionGroup } from './Sidebar';

interface CanvasAreaProps {
    imageSrc: string | null;
    landmarks: NormalizedLandmark[] | null;
    groups: SelectionGroup[];
    activeGroupId: string;
    brushSize: number;
    mode: 'add' | 'subtract';
    onSelectionChange: (indices: number[], mode: 'add' | 'subtract') => void;
    onImageLoaded: (image: HTMLImageElement) => void;
    dotColor: 'white' | 'black';
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({
    imageSrc,
    landmarks,
    groups,
    activeGroupId,
    brushSize,
    mode,
    onSelectionChange,
    onImageLoaded,
    dotColor
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

    // View transform state
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });

    // Interaction state
    const isDragging = useRef(false);
    const isPanning = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // Screen space for cursor drawing

    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    // Memoize the active group indices for faster lookup during drag
    // But since selection change triggers re-render, we can just grab it.
    const activeGroup = groups.find(g => g.id === activeGroupId);

    // Load image
    useEffect(() => {
        if (!imageSrc) return;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageSrc;
        img.onload = () => {
            setImgElement(img);
            onImageLoaded(img);
            // Reset view
            setScale(1);
            setPan({ x: 0, y: 0 });
        };
    }, [imageSrc, onImageLoaded]);

    // Main Draw Loop
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !imgElement) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();

        // Apply Transform: Translate then Scale
        ctx.translate(pan.x, pan.y);
        ctx.scale(scale, scale);

        // 1. Draw Image
        ctx.drawImage(imgElement, 0, 0);

        // 2. Draw Landmarks
        if (landmarks) {
            const pointRadiusSelected = 4 / scale;
            const pointRadiusNormal = 2 / scale;
            const lineWidth = 1 / scale;

            // Pre-calculate point states for performance since we have 468/478 pts
            // We want to know for each point:
            // - Is it in active group? -> Draw Active Color (e.g. bright purple or user selected?)
            //   Wait, sidebar lets us set color PER group. So Active Group should effectively use its color?
            //   And maybe highlight it? Or just showing it is enough?
            // - Is it in another visible group? -> Draw that group's color.
            // - Overlap? Priority to Active, then order in list (or reverse).

            // Optimization: Create a map of index -> { color, isSelected }
            // But doing this every frame might be expensive if many groups?
            // Actually 478 points * 10 groups is tiny.

            const pointStyles = new Map<number, { color: string, radius: number, stroke: string }>();

            // Populate styles from groups (lowest priority first, so higher priority overwrites)
            // Reverse groups to render top-most first? No, we iterate groups to assign styles.
            // Let's say last group in list is "on top"? Or first? Usually Top is First.
            // But we specifically want ACTIVE to be on top.

            const visibleGroups = groups.filter(g => g.visible && g.id !== activeGroupId);
            // Add active group at the end to overwrite others
            if (activeGroup && activeGroup.visible) visibleGroups.push(activeGroup);
            // Actually, if active group is hidden, we might still want to show it while editing? 
            // Usually yes. But if user hid it, maybe not? Let's respect visibility.

            visibleGroups.forEach(g => {
                g.indices.forEach(idx => {
                    pointStyles.set(idx, {
                        color: g.color, // Fill with group color
                        radius: pointRadiusSelected,
                        // If active, maybe diff stroke?
                        stroke: g.id === activeGroupId ? '#fff' : 'rgba(255,255,255,0.5)'
                    });
                });
            });

            landmarks.forEach((landmark, index) => {
                const x = landmark.x * imgElement.naturalWidth;
                const y = landmark.y * imgElement.naturalHeight;

                const style = pointStyles.get(index);

                ctx.beginPath();

                if (style) {
                    ctx.arc(x, y, style.radius, 0, 2 * Math.PI);
                    ctx.fillStyle = style.color;
                    ctx.strokeStyle = style.stroke;
                    ctx.lineWidth = lineWidth;
                } else {
                    // Unselected
                    ctx.arc(x, y, pointRadiusNormal, 0, 2 * Math.PI);
                    ctx.fillStyle = dotColor === 'white' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
                    ctx.strokeStyle = dotColor === 'white' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)';
                    ctx.lineWidth = lineWidth * 0.5;
                }

                ctx.fill();
                ctx.stroke();
            });
        }

        ctx.restore();

        // 3. Draw Brush Cursor (Screen Space)
        if (mousePos.x !== 0 && mousePos.y !== 0) {
            ctx.beginPath();
            ctx.arc(mousePos.x, mousePos.y, brushSize, 0, 2 * Math.PI);
            ctx.strokeStyle = mode === 'add' ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

    }, [imgElement, landmarks, groups, activeGroupId, activeGroup, pan, scale, mousePos, brushSize, mode, dotColor]);

    useEffect(() => {
        draw();
    }, [draw]);

    // Handle Resize to fit container
    useEffect(() => {
        const resize = () => {
            if (containerRef.current && canvasRef.current && imgElement) {
                canvasRef.current.width = containerRef.current.clientWidth;
                canvasRef.current.height = containerRef.current.clientHeight;
                draw();
            }
        }
        window.addEventListener('resize', resize);
        resize();
        return () => window.removeEventListener('resize', resize);
    }, [imgElement, draw]);


    // Coords Transforms
    const screenToWorld = (sx: number, sy: number) => {
        return {
            x: (sx - pan.x) / scale,
            y: (sy - pan.y) / scale
        };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        lastMousePos.current = { x, y };

        if (e.button === 1 || e.button === 2 || e.shiftKey) { // Middle or Right or Shift+Click
            isPanning.current = true;
            e.preventDefault();
        } else if (e.button === 0) { // Left Click
            isDragging.current = true;
            performSelection(x, y);
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const dx = x - lastMousePos.current.x;
        const dy = y - lastMousePos.current.y;

        lastMousePos.current = { x, y };
        setMousePos({ x, y });

        if (isPanning.current) {
            setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            return;
        }

        if (isDragging.current) {
            performSelection(x, y);
        }

        // Hover check
        if (imgElement && landmarks) {
            const worldPos = screenToWorld(x, y);
            let foundHover = -1;
            const hoverThresh = 5 / scale;

            landmarks.forEach((l, i) => {
                const lx = l.x * imgElement.naturalWidth;
                const ly = l.y * imgElement.naturalHeight;
                const dist = Math.sqrt((lx - worldPos.x) ** 2 + (ly - worldPos.y) ** 2);
                if (dist < hoverThresh) {
                    foundHover = i;
                }
            });

            setHoveredIndex(foundHover !== null && foundHover !== -1 ? foundHover : null);
            if (foundHover !== -1) setTooltipPos({ x: e.clientX, y: e.clientY });
        }
    };

    const performSelection = (screenX: number, screenY: number) => {
        if (!landmarks || !imgElement) return;

        const worldPos = screenToWorld(screenX, screenY);
        const worldRadiusSq = (brushSize / scale) ** 2;

        const indicesToUpdate: number[] = [];

        landmarks.forEach((l, i) => {
            const lx = l.x * imgElement.naturalWidth;
            const ly = l.y * imgElement.naturalHeight;
            const distSq = (lx - worldPos.x) ** 2 + (ly - worldPos.y) ** 2;

            if (distSq < worldRadiusSq) {
                indicesToUpdate.push(i);
            }
        });

        if (indicesToUpdate.length > 0) {
            onSelectionChange(indicesToUpdate, mode);
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        isDragging.current = false;
        isPanning.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const zoomFactor = Math.exp(delta);

        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newScale = Math.max(0.1, Math.min(20, scale * zoomFactor));
        const newPanX = mouseX - (mouseX - pan.x) * (newScale / scale);
        const newPanY = mouseY - (mouseY - pan.y) * (newScale / scale);

        setScale(newScale);
        setPan({ x: newPanX, y: newPanY });
    };

    return (
        <div className="canvas-area" ref={containerRef} style={{ overflow: 'hidden' }}>
            <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={() => {
                    isDragging.current = false;
                    isPanning.current = false;
                    setHoveredIndex(null);
                    setMousePos({ x: 0, y: 0 });
                }}
                onWheel={handleWheel}
                onContextMenu={(e) => e.preventDefault()}
                style={{ touchAction: 'none', cursor: 'none' }}
            />
            {hoveredIndex !== null && (
                <div
                    className="landmark-tooltip"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    ID: {hoveredIndex}
                </div>
            )}
        </div>
    );
};

