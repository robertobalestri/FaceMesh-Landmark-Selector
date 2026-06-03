
import { useEffect, useState, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import type { SelectionGroup } from './components/Sidebar';
import { CanvasArea } from './components/CanvasArea';
import { initFaceMesh, detectFace } from './services/facemesh';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { useGroupManager } from './hooks/useGroupManager';
import testImage from './assets/test.png';
import symmetryMapRaw from './utils/symmetry_map.json';
import './App.css';

const symmetryMap: Record<number, number> = {};
Object.entries(symmetryMapRaw).forEach(([k, v]) => {
  symmetryMap[Number(k)] = Number(v);
});

function App() {
  const [loading, setLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string | null>(testImage);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);

  // Hook-based State Management
  const {
    groups,
    activeGroupId,
    setActiveGroupId,
    addGroup,
    deleteGroup,
    updateGroup,
    setGroupIndices,
    replaceAllGroups,
    updateSelection,
    resetGroups,
    undo,
    redo,
    canUndo,
    canRedo
  } = useGroupManager();

  const [brushSize, setBrushSize] = useState(10);
  const [mode, setMode] = useState<'add' | 'subtract'>('add');
  const [dotColor, setDotColor] = useState<'white' | 'black'>('white');
  const [showWireframe, setShowWireframe] = useState(false);
  const [offsets, setOffsets] = useState<Record<number, { dx: number, dy: number }>>({});
  const [imageSize, setImageSize] = useState<{ width: number, height: number } | null>(null);
  const [tool, setTool] = useState<'select' | 'transform'>('select');

  const isLoadedRef = useRef(false);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const savedGroupsStr = localStorage.getItem('facemesh_groups');
      const savedActiveGroupId = localStorage.getItem('facemesh_active_group_id');
      const savedOffsetsStr = localStorage.getItem('facemesh_offsets');

      if (savedGroupsStr) {
        const parsed = JSON.parse(savedGroupsStr);
        const restoredGroups = parsed.map((g: any) => ({
          ...g,
          indices: new Set(g.indices)
        }));
        replaceAllGroups(restoredGroups);
      }
      
      if (savedActiveGroupId) {
        setActiveGroupId(savedActiveGroupId);
      }

      if (savedOffsetsStr) {
        setOffsets(JSON.parse(savedOffsetsStr));
      }
    } catch (e) {
      console.warn("Failed to load saved workspace:", e);
    } finally {
      isLoadedRef.current = true;
    }
  }, [replaceAllGroups, setActiveGroupId]);

  // Save to local storage on changes
  useEffect(() => {
    if (!isLoadedRef.current) return;
    try {
      const serializedGroups = groups.map(g => ({
        ...g,
        indices: Array.from(g.indices)
      }));
      localStorage.setItem('facemesh_groups', JSON.stringify(serializedGroups));
      localStorage.setItem('facemesh_active_group_id', activeGroupId);
      localStorage.setItem('facemesh_offsets', JSON.stringify(offsets));
    } catch (e) {
      console.warn("Failed to save workspace:", e);
    }
  }, [groups, activeGroupId, offsets]);

  const handleResetWorkspace = () => {
    if (window.confirm("Are you sure you want to reset the workspace? This will clear all groups and transform offsets.")) {
      localStorage.removeItem('facemesh_groups');
      localStorage.removeItem('facemesh_active_group_id');
      localStorage.removeItem('facemesh_offsets');
      
      resetGroups([{ id: '1', name: 'Default', indices: new Set(), visible: true, color: '#bb86fc' }]);
      setActiveGroupId('1');
      setOffsets({});
    }
  };

  useEffect(() => {
    initFaceMesh().then(() => {
      setLoading(false);
      console.log('FaceMesh initialized');
    });
  }, []);

  const handleImageLoaded = useCallback((img: HTMLImageElement) => {
    try {
      const results = detectFace(img);
      if (results) {
        setLandmarks(results);
        setImageSize({ width: img.width, height: img.height });
        // Reset groups on new image
        resetGroups([{ id: '1', name: 'Default', indices: new Set(), visible: true, color: '#bb86fc' }]);
        setActiveGroupId('1');
      } else {
        console.warn("No face detected in loaded image.");
      }
    } catch (e) {
      console.warn("Detection failed (likely not ready):", e);
    }
  }, [resetGroups, setActiveGroupId]);

  // Update indices of the ACTIVE group via Canvas
  const handleSelectionChange = useCallback((indices: number[], currentMode: 'add' | 'subtract') => {
    updateSelection(indices, currentMode);
  }, [updateSelection]);

  // Wrappers for Sidebar actions that need App logic
  const handleCopySpecular = () => {
    const activeGroup = groups.find(g => g.id === activeGroupId);
    if (!activeGroup) return;

    const next = new Set(activeGroup.indices);
    activeGroup.indices.forEach(idx => {
      if (symmetryMap[idx] !== undefined) {
        next.add(symmetryMap[idx]);
      }
    });
    setGroupIndices(activeGroupId, next);
  };

  const handleClear = () => {
    setGroupIndices(activeGroupId, new Set());
  };

  const handleInverseSelection = () => {
    if (!landmarks) return;
    const activeGroup = groups.find(g => g.id === activeGroupId);
    if (!activeGroup) return;

    const allIndices = new Set(landmarks.map((_, i) => i));
    const inverse = new Set<number>();
    allIndices.forEach(idx => {
      if (!activeGroup.indices.has(idx)) {
        inverse.add(idx);
      }
    });
    setGroupIndices(activeGroupId, inverse);
  };

  const handleRenameGroup = (id: string, newName: string) => updateGroup(id, { name: newName });
  const handleToggleGroupVisibility = (id: string) => {
    const g = groups.find(g => g.id === id);
    if (g) updateGroup(id, { visible: !g.visible });
  };
  const handleSetGroupColor = (id: string, color: string) => updateGroup(id, { color });


  const handleExport = (format: string = 'json') => {
    let dataStr = "";
    let filename = "landmarks_groups";

    const imgW = imageSize?.width || 1;
    const imgH = imageSize?.height || 1;

    if (format === 'json') {
      const exportData: Record<string, number[]> = {};
      groups.forEach(g => {
        exportData[g.name] = Array.from(g.indices).sort((a, b) => a - b);
      });
      dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      filename += ".json";
    } else if (format === 'csv') {
      let csvContent = "Group Name,Indices\n";
      groups.forEach(g => {
        csvContent += `"${g.name}","${Array.from(g.indices).sort((a, b) => a - b).join(',')}"\n`;
      });
      dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
      filename += ".csv";
    } else if (format === 'txt') {
      let txtContent = "";
      groups.forEach(g => {
        txtContent += `[${g.name}]\n`;
        txtContent += Array.from(g.indices).sort((a, b) => a - b).join(', ') + "\n\n";
      });
      dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(txtContent);
      filename += ".txt";
    } else if (format === 'json-coords-norm') {
      if (!landmarks) return;
      const exportData: Record<string, { index: number, x: number, y: number, z: number }[]> = {};
      groups.forEach(g => {
        exportData[g.name] = Array.from(g.indices).sort((a, b) => a - b).map(idx => {
          const l = landmarks[idx];
          const off = offsets[idx] || { dx: 0, dy: 0 };
          return {
            index: idx,
            x: l.x + (off.dx / imgW),
            y: l.y + (off.dy / imgH),
            z: l.z
          };
        });
      });
      dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      filename += "_normalized_coords.json";
    } else if (format === 'json-coords-pixel') {
      if (!landmarks) return;
      const exportData: Record<string, { index: number, x: number, y: number, z: number }[]> = {};
      groups.forEach(g => {
        exportData[g.name] = Array.from(g.indices).sort((a, b) => a - b).map(idx => {
          const l = landmarks[idx];
          const off = offsets[idx] || { dx: 0, dy: 0 };
          return {
            index: idx,
            x: (l.x * imgW) + off.dx,
            y: (l.y * imgH) + off.dy,
            z: l.z * imgW
          };
        });
      });
      dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      filename += "_pixel_coords.json";
    } else if (format === 'csv-coords-norm') {
      if (!landmarks) return;
      let csvContent = "Group Name,Index,X (Normalized),Y (Normalized),Z\n";
      groups.forEach(g => {
        Array.from(g.indices).sort((a, b) => a - b).forEach(idx => {
          const l = landmarks[idx];
          const off = offsets[idx] || { dx: 0, dy: 0 };
          const nx = l.x + (off.dx / imgW);
          const ny = l.y + (off.dy / imgH);
          csvContent += `"${g.name}",${idx},${nx.toFixed(6)},${ny.toFixed(6)},${l.z.toFixed(6)}\n`;
        });
      });
      dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
      filename += "_normalized_coords.csv";
    } else if (format === 'csv-coords-pixel') {
      if (!landmarks) return;
      let csvContent = "Group Name,Index,X (Pixel),Y (Pixel),Z (Scaled)\n";
      groups.forEach(g => {
        Array.from(g.indices).sort((a, b) => a - b).forEach(idx => {
          const l = landmarks[idx];
          const off = offsets[idx] || { dx: 0, dy: 0 };
          const px = (l.x * imgW) + off.dx;
          const py = (l.y * imgH) + off.dy;
          const pz = l.z * imgW;
          csvContent += `"${g.name}",${idx},${px.toFixed(2)},${py.toFixed(2)},${pz.toFixed(2)}\n`;
        });
      });
      dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
      filename += "_pixel_coords.csv";
    }

    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleTransformGroup = (dx: number, dy: number) => {
    const activeGroup = groups.find(g => g.id === activeGroupId);
    if (!activeGroup) return;

    setOffsets(prev => {
      const next = { ...prev };
      activeGroup.indices.forEach(idx => {
        const current = next[idx] || { dx: 0, dy: 0 };
        next[idx] = { dx: current.dx + dx, dy: current.dy + dy };
      });
      return next;
    });
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (re) => {
        try {
          const json = JSON.parse(re.target?.result as string);

          if (Array.isArray(json)) {
            // Legacy import
            setGroupIndices(activeGroupId, new Set(json));
          } else if (typeof json === 'object') {
            const newGroups: SelectionGroup[] = [];

            Object.entries(json).forEach(([name, indices]) => {
              const id = Math.random().toString(36).substr(2, 9);
              if (Array.isArray(indices)) {
                newGroups.push({
                  id,
                  name,
                  indices: new Set(indices as number[]),
                  visible: true,
                  color: '#bb86fc'
                });
              }
            });

            if (newGroups.length > 0) {
              replaceAllGroups(newGroups);
            } else {
              alert('No valid groups found in JSON.');
            }
          } else {
            alert('Invalid JSON format.');
          }
        } catch (err) {
          alert('Failed to parse JSON');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setImageSrc(url);
      }
    }
    input.click();
  }

  return (
    <div className="app-container">
      <Sidebar
        brushSize={brushSize}
        setBrushSize={setBrushSize}
        mode={mode}
        setMode={setMode}

        groups={groups}
        activeGroupId={activeGroupId}
        onSetActiveGroup={setActiveGroupId}
        onAddGroup={addGroup}
        onDeleteGroup={deleteGroup}
        onRenameGroup={handleRenameGroup}
        onToggleGroupVisibility={handleToggleGroupVisibility}
        onSetGroupColor={handleSetGroupColor}

        onCopySpecular={handleCopySpecular}
        onClearSelection={handleClear}
        onInverseSelection={handleInverseSelection}

        onExport={handleExport}
        onImportJSON={handleImportJSON}
        onUploadClick={handleUpload}
        onTransformGroup={handleTransformGroup}

        dotColor={dotColor}
        setDotColor={setDotColor}

        showWireframe={showWireframe}
        setShowWireframe={setShowWireframe}

        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}

        tool={tool}
        setTool={setTool}
        onResetWorkspace={handleResetWorkspace}
      />

      <CanvasArea
        imageSrc={loading ? null : imageSrc}
        landmarks={landmarks}
        groups={groups}
        activeGroupId={activeGroupId}
        brushSize={brushSize}
        mode={mode}
        onSelectionChange={handleSelectionChange}
        onImageLoaded={handleImageLoaded}
        dotColor={dotColor}
        showWireframe={showWireframe}
        offsets={offsets}
        tool={tool}
        onUpdateOffsets={setOffsets}
        symmetryMap={symmetryMap}
      />

      {loading && (
        <div className="loading-overlay">
          <h2>Initializing FaceMesh...</h2>
        </div>
      )}

      {!imageSrc && !loading && (
        <div className="upload-overlay">
          <h2>Select an Image to Start</h2>
          <button onClick={handleUpload} className="primary" style={{ marginTop: 20 }}>
            Upload Image
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
