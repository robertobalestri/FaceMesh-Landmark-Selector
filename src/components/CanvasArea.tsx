import React, { useRef, useEffect, useState } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { FACEMESH_TESSELATION } from '@mediapipe/face_mesh';
import type { SelectionGroup } from './Sidebar';

interface CanvasAreaProps {
    imageSrc: string | null;
    landmarks: NormalizedLandmark[] | null;
    groups: SelectionGroup[];
    activeGroupId: string;
    brushSize: number;
    mode: 'add' | 'subtract';
    onSelectionChange: (indices: number[], mode: 'add' | 'subtract') => void;
    onImageLoaded: (img: HTMLImageElement) => void;
    dotColor: 'white' | 'black';
    showWireframe?: boolean;
    offsets?: Record<number, { dx: number, dy: number }>;
    tool: 'select' | 'transform';
    onUpdateOffsets: (newOffsets: Record<number, { dx: number, dy: number }>) => void;
    symmetryMap: Record<number, number>;
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
    dotColor,
    showWireframe = false,
    offsets = {},
    tool,
    onUpdateOffsets,
    symmetryMap = {}
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);
    const [drawingMode, setDrawingMode] = useState<'add' | 'subtract' | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);

    // Transform drag states
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragStartImagePos, setDragStartImagePos] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [dragStartOffsets, setDragStartOffsets] = useState<{ idx: number, dx: number, dy: number, isCounterpart?: boolean }[]>([]);
    const [symmetricEditing, setSymmetricEditing] = useState<boolean>(() => {
        const saved = localStorage.getItem('facemesh_symmetric_editing');
        return saved !== null ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        localStorage.setItem('facemesh_symmetric_editing', JSON.stringify(symmetricEditing));
    }, [symmetricEditing]);

    // Initial Image Load
    useEffect(() => {
        if (imageSrc) {
            const img = new Image();
            img.src = imageSrc;
            img.crossOrigin = "anonymous";
            img.onload = () => {
                setLoadedImg(img);
                onImageLoaded(img);
                
                if (containerRef.current) {
                    const cw = containerRef.current.clientWidth;
                    const ch = containerRef.current.clientHeight;
                    const scaleX = cw / img.width;
                    const scaleY = ch / img.height;
                    const newScale = Math.min(scaleX, scaleY) * 0.9;
                    setScale(newScale);
                    setOffset({
                        x: (cw - img.width * newScale) / 2,
                        y: (ch - img.height * newScale) / 2
                    });
                }
            };
        }
    }, [imageSrc]); // Only reload if src changes

    // Resize canvas to container
    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasRef.current && containerRef.current) {
                canvasRef.current.width = containerRef.current.clientWidth;
                canvasRef.current.height = containerRef.current.clientHeight;
                if (loadedImg) draw(loadedImg);
            }
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [loadedImg, scale, offset]); // Also redraw when scale/offset changes? 

    // Redraw when props change
    useEffect(() => {
        if (loadedImg) {
            draw(loadedImg);
        }
    }, [landmarks, groups, activeGroupId, dotColor, showWireframe, scale, offset, loadedImg, offsets]);

    // Zoom Handling
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomSensitivity = 0.001;
            const delta = -e.deltaY * zoomSensitivity;
            
            setScale(prevScale => {
                let newScale = prevScale * (1 + delta);
                newScale = Math.max(0.05, Math.min(newScale, 50));
                
                setOffset(prevOffset => {
                    const imageX = (mouseX - prevOffset.x) / prevScale;
                    const imageY = (mouseY - prevOffset.y) / prevScale;
                    const newOffsetX = mouseX - imageX * newScale;
                    const newOffsetY = mouseY - imageY * newScale;
                    return { x: newOffsetX, y: newOffsetY };
                });
                return newScale;
            });
        };

        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, []);

    const draw = (img: HTMLImageElement) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.scale(scale, scale);

        ctx.drawImage(img, 0, 0, img.width, img.height);

        if (landmarks) {
            // Draw Wireframe
            if (showWireframe) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 0.5 / scale;
                ctx.beginPath();
                const tesselation = FACEMESH_TESSELATION as any;
                for (const connection of tesselation) {
                    const startIdx = connection.u !== undefined ? connection.u : connection[0];
                    const endIdx = connection.v !== undefined ? connection.v : connection[1];

                    const p1 = landmarks[startIdx];
                    const p2 = landmarks[endIdx];
                    if (p1 && p2) {
                        const off1 = offsets[startIdx] || { dx: 0, dy: 0 };
                        const off2 = offsets[endIdx] || { dx: 0, dy: 0 };
                        ctx.moveTo((p1.x * img.width) + off1.dx, (p1.y * img.height) + off1.dy);
                        ctx.lineTo((p2.x * img.width) + off2.dx, (p2.y * img.height) + off2.dy);
                    }
                }
                ctx.stroke();
            }

            // Draw Landmarks
            landmarks.forEach((landmark, index) => {
                const off = offsets[index] || { dx: 0, dy: 0 };
                const x = (landmark.x * img.width) + off.dx;
                const y = (landmark.y * img.height) + off.dy;

                let color = dotColor === 'white' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
                let radius = 1 / scale;

                let inGroups: { color: string, isActive: boolean }[] = [];

                groups.forEach(g => {
                    if (g.visible && g.indices.has(index)) {
                        inGroups.push({ color: g.color, isActive: g.id === activeGroupId });
                    }
                });

                if (inGroups.length > 0) {
                    const active = inGroups.find(x => x.isActive);
                    if (active) {
                        color = active.color;
                        radius = 2.5 / scale;
                    } else {
                        color = inGroups[inGroups.length - 1].color;
                        radius = 2 / scale;
                    }
                }

                // Highlight hovered or dragged point in transform mode
                const isHovered = tool === 'transform' && index === hoveredIndex;
                const isDragged = tool === 'transform' && index === draggedIndex;

                if (isHovered || isDragged) {
                    ctx.strokeStyle = '#03dac6';
                    ctx.lineWidth = 1.5 / scale;
                    ctx.beginPath();
                    ctx.arc(x, y, radius + 4 / scale, 0, 2 * Math.PI);
                    ctx.stroke();
                }

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, 2 * Math.PI);
                ctx.fill();
            });
        }
        ctx.restore();
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setMousePos({ x: e.clientX, y: e.clientY });

        if (isPanning) {
            setOffset(prev => ({
                x: prev.x + e.movementX,
                y: prev.y + e.movementY
            }));
            return;
        }

        if (tool === 'transform' && draggedIndex !== null && loadedImg) {
            const currentImageX = (mouseX - offset.x) / scale;
            const currentImageY = (mouseY - offset.y) / scale;

            const deltaX = currentImageX - dragStartImagePos.x;
            const deltaY = currentImageY - dragStartImagePos.y;

            const nextOffsets = { ...offsets };
            dragStartOffsets.forEach(item => {
                if (item.isCounterpart) {
                    nextOffsets[item.idx] = {
                        dx: item.dx - deltaX,
                        dy: item.dy + deltaY
                    };
                } else {
                    nextOffsets[item.idx] = {
                        dx: item.dx + deltaX,
                        dy: item.dy + deltaY
                    };
                }
            });
            onUpdateOffsets(nextOffsets);
            return;
        }

        if (tool === 'transform' && draggedIndex === null) {
            let bestDist = 10;
            let bestIdx: number | null = null;

            if (landmarks && loadedImg) {
                landmarks.forEach((l, i) => {
                    const off = offsets[i] || { dx: 0, dy: 0 };
                    const lx = (l.x * loadedImg.width + off.dx) * scale + offset.x;
                    const ly = (l.y * loadedImg.height + off.dy) * scale + offset.y;
                    const dist = Math.sqrt(Math.pow(mouseX - lx, 2) + Math.pow(mouseY - ly, 2));
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestIdx = i;
                    }
                });
            }
            setHoveredIndex(bestIdx);
            return;
        }

        if (!drawingMode || !landmarks || !loadedImg) return;

        const indices: number[] = [];
        landmarks.forEach((l, i) => {
            const off = offsets[i] || { dx: 0, dy: 0 };
            const lx = (l.x * loadedImg.width + off.dx) * scale + offset.x;
            const ly = (l.y * loadedImg.height + off.dy) * scale + offset.y;
            const dist = Math.sqrt(Math.pow(mouseX - lx, 2) + Math.pow(mouseY - ly, 2));
            if (dist <= brushSize) {
                indices.push(i);
            }
        });

        if (indices.length > 0) {
            onSelectionChange(indices, drawingMode);
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
            setIsPanning(true);
            return;
        }

        if (tool === 'transform' && hoveredIndex !== null && loadedImg) {
            const rect = canvasRef.current!.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const imageX = (mouseX - offset.x) / scale;
            const imageY = (mouseY - offset.y) / scale;

            setDraggedIndex(hoveredIndex);
            setDragStartImagePos({ x: imageX, y: imageY });

            const initial: { idx: number; dx: number; dy: number; isCounterpart: boolean }[] = [];
            
            // Drag the main hovered point
            const currentOff = offsets[hoveredIndex] || { dx: 0, dy: 0 };
            initial.push({ idx: hoveredIndex, dx: currentOff.dx, dy: currentOff.dy, isCounterpart: false });

            // Symmetrical counterpart dragging
            if (symmetricEditing) {
                const counterpartIndex = symmetryMap[hoveredIndex];
                if (counterpartIndex !== undefined && counterpartIndex !== hoveredIndex) {
                    const counterpartOff = offsets[counterpartIndex] || { dx: 0, dy: 0 };
                    initial.push({ idx: counterpartIndex, dx: counterpartOff.dx, dy: counterpartOff.dy, isCounterpart: true });
                }
            }
            
            setDragStartOffsets(initial);
            return;
        }

        if (e.button === 0) {
            setDrawingMode(mode);
            setMousePos({ x: e.clientX, y: e.clientY });
            handleMouseMove(e);
        } else if (e.button === 2) {
            setDrawingMode(mode === 'add' ? 'subtract' : 'add');
            setMousePos({ x: e.clientX, y: e.clientY });
            handleMouseMove(e);
        }
    };

    const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault(); // Prevent right-click menu
    };

    const handleMouseUp = () => {
        setDrawingMode(null);
        setIsPanning(false);
        setDraggedIndex(null);
        setDragStartOffsets([]);
    };

    const handleMouseLeave = () => {
        setDrawingMode(null);
        setIsPanning(false);
        setMousePos(null);
        setDraggedIndex(null);
        setDragStartOffsets([]);
        setHoveredIndex(null);
    };

    const getCursor = () => {
        if (isPanning) return 'grabbing';
        if (tool === 'transform') {
            if (draggedIndex !== null) return 'grabbing';
            if (hoveredIndex !== null) return 'grab';
        }
        return 'default';
    };

    return (
        <div ref={containerRef} className="canvas-area" style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onContextMenu={handleContextMenu}
                style={{ display: 'block', cursor: getCursor() }}
            />
            {/* Legend Overlay */}
            <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                color: 'white',
                padding: '14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                display: 'grid',
                gridTemplateColumns: 'auto auto',
                gap: '8px 12px',
                pointerEvents: 'none',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                zIndex: 10
            }}>
                {tool === 'select' ? (
                    <>
                        <span style={{ fontWeight: 'bold', color: '#bb86fc' }}>Left Click</span>
                        <span>Add to selection</span>

                        <span style={{ fontWeight: 'bold', color: '#cf6679' }}>Right Click</span>
                        <span>Remove from selection</span>
                    </>
                ) : (
                    <>
                        <span style={{ fontWeight: 'bold', color: '#03dac6' }}>Drag Landmark</span>
                        <span>Move landmark position</span>

                        <span style={{ fontWeight: 'bold', color: '#bb86fc' }}>Symmetric Drag</span>
                        <span>Mirrors offset on other side</span>
                    </>
                )}

                <span style={{ fontWeight: 'bold', color: '#03dac6' }}>Mouse Wheel Click / Shift + Left click</span>
                <span>Pan image</span>

                <span style={{ fontWeight: 'bold', color: '#ffb74d' }}>Scroll</span>
                <span>Zoom in/out</span>
            </div>

            {/* Symmetry Toggle Button */}
            {tool === 'transform' && (
                <button 
                    onClick={() => setSymmetricEditing(!symmetricEditing)}
                    style={{
                        position: 'absolute',
                        top: '140px',
                        right: '10px',
                        backgroundColor: symmetricEditing ? 'rgba(3, 218, 198, 0.9)' : 'rgba(0, 0, 0, 0.75)',
                        color: symmetricEditing ? 'black' : 'white',
                        border: symmetricEditing ? '1px solid #03dac6' : '1px solid #444',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        zIndex: 11,
                        transition: 'all 0.2s ease',
                        pointerEvents: 'auto'
                    }}
                >
                    <span>🪞 Symmetric Drag: {symmetricEditing ? "ON" : "OFF"}</span>
                </button>
            )}

            {mousePos && !isPanning && tool === 'select' && (
                <div 
                    style={{
                        position: 'fixed',
                        left: mousePos.x,
                        top: mousePos.y,
                        width: brushSize * 2,
                        height: brushSize * 2,
                        borderRadius: '50%',
                        border: '1px solid rgba(255,255,255,0.8)',
                        backgroundColor: (drawingMode || mode) === 'add' ? 'rgba(255,255,255,0.1)' : 'rgba(255,0,0,0.1)',
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none',
                        zIndex: 100
                    }}
                />
            )}
        </div>
    );
};
