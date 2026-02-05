
import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import type { SelectionGroup } from './components/Sidebar';
import { CanvasArea } from './components/CanvasArea';
import { initFaceMesh, detectFace } from './services/facemesh';
import { calculateSymmetryMap } from './utils/geometry';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import testImage from './assets/test.png';
import './App.css';

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function getRandomColor() {
  const colors = ['#bb86fc', '#03dac6', '#cf6679', '#ffb74d', '#4dd0e1', '#aed581'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function App() {
  const [loading, setLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string | null>(testImage);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);

  // Selection Groups State
  const [groups, setGroups] = useState<SelectionGroup[]>([
    { id: '1', name: 'Default', indices: new Set(), visible: true, color: '#bb86fc' }
  ]);
  const [activeGroupId, setActiveGroupId] = useState<string>('1');

  const [brushSize, setBrushSize] = useState(10);
  const [mode, setMode] = useState<'add' | 'subtract'>('add');
  const [dotColor, setDotColor] = useState<'white' | 'black'>('white');
  const [symmetryMap, setSymmetryMap] = useState<Record<number, number>>({});

  // History not easily compatible with multi-groups yet without deep copy. Disabling for now or simplest implementation.
  // const historyRef = useRef<Set<number>[]>([]); 

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
        // Reset groups on new image? Or keep?
        // Let's reset to one default group
        setGroups([{ id: '1', name: 'Default', indices: new Set(), visible: true, color: '#bb86fc' }]);
        setActiveGroupId('1');

        const map = calculateSymmetryMap(results);
        setSymmetryMap(map);
      } else {
        console.warn("No face detected in loaded image.");
      }
    } catch (e) {
      console.warn("Detection failed (likely not ready):", e);
    }
  }, []);

  // Update indices of the ACTIVE group
  const handleSelectionChange = useCallback((indices: number[], currentMode: 'add' | 'subtract') => {
    setGroups(prevGroups => {
      return prevGroups.map(g => {
        if (g.id !== activeGroupId) return g;

        const nextIndices = new Set(g.indices);
        let changed = false;

        indices.forEach(idx => {
          if (currentMode === 'add') {
            if (!nextIndices.has(idx)) {
              nextIndices.add(idx);
              changed = true;
            }
          } else {
            if (nextIndices.has(idx)) {
              nextIndices.delete(idx);
              changed = true;
            }
          }
        });

        if (changed) {
          return { ...g, indices: nextIndices };
        }
        return g;
      });
    });
  }, [activeGroupId]);

  // Group Management Handlers
  const handleAddGroup = () => {
    const newId = generateId();
    const newGroup: SelectionGroup = {
      id: newId,
      name: `Group ${groups.length + 1}`,
      indices: new Set(),
      visible: true,
      color: getRandomColor()
    };
    setGroups([...groups, newGroup]);
    setActiveGroupId(newId);
  };

  const handleDeleteGroup = (id: string) => {
    if (groups.length <= 1) return;
    const newGroups = groups.filter(g => g.id !== id);
    setGroups(newGroups);
    if (activeGroupId === id) {
      setActiveGroupId(newGroups[0].id);
    }
  };

  const handleRenameGroup = (id: string, newName: string) => {
    setGroups(groups.map(g => g.id === id ? { ...g, name: newName } : g));
  };

  const handleToggleGroupVisibility = (id: string) => {
    setGroups(groups.map(g => g.id === id ? { ...g, visible: !g.visible } : g));
  };

  const handleSetGroupColor = (id: string, color: string) => {
    setGroups(groups.map(g => g.id === id ? { ...g, color } : g));
  };


  const handleCopySpecular = () => {
    setGroups(prev => prev.map(g => {
      if (g.id !== activeGroupId) return g;
      const next = new Set(g.indices);
      g.indices.forEach(idx => {
        if (symmetryMap[idx] !== undefined) {
          next.add(symmetryMap[idx]);
        }
      });
      return { ...g, indices: next };
    }));
  };

  const handleClear = () => {
    setGroups(prev => prev.map(g => {
      if (g.id !== activeGroupId) return g;
      return { ...g, indices: new Set() };
    }));
  };

  const handleInverseSelection = () => {
    if (!landmarks) return;
    const allIndices = new Set(landmarks.map((_, i) => i));

    setGroups(prev => prev.map(g => {
      if (g.id !== activeGroupId) return g;

      const inverse = new Set<number>();
      allIndices.forEach(idx => {
        if (!g.indices.has(idx)) {
          inverse.add(idx);
        }
      });
      return { ...g, indices: inverse };
    }));
  };

  const handleExport = () => {
    // Export format: { [groupName]: [indices] }
    const exportData: Record<string, number[]> = {};
    groups.forEach(g => {
      exportData[g.name] = Array.from(g.indices).sort((a, b) => a - b);
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "landmarks_groups.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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
            // Legacy import: just one array, put in active group
            setGroups(prev => prev.map(g => {
              if (g.id !== activeGroupId) return g;
              return { ...g, indices: new Set(json) };
            }));
          } else if (typeof json === 'object') {
            // New format: { "Group1": [...], "Group2": [...] }
            // Replace all groups
            const newGroups: SelectionGroup[] = [];
            let firstId = '';
            Object.entries(json).forEach(([name, indices], idx) => {
              const id = generateId();
              if (idx === 0) firstId = id;
              // Handle if value is not array?
              if (Array.isArray(indices)) {
                newGroups.push({
                  id,
                  name,
                  indices: new Set(indices as number[]),
                  visible: true,
                  color: getRandomColor()
                });
              }
            });

            if (newGroups.length > 0) {
              setGroups(newGroups);
              setActiveGroupId(firstId);
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

  // Flatten selection for Canvas (it needs to know if a point is selected and maybe by what color)
  // Current CanvasArea might need refactoring to handle multi-color or just "is this point selected?"
  // But we want to see multiple groups.
  // We'll pass `groups` to CanvasArea instead of `selection`.
  // Note: CanvasArea needs update. For now, let's construct a "Master Set" for backward compat if we didn't update CanvasArea?
  // No, I must update CanvasArea in next step. I'll modify App now assuming CanvasArea will accept `groups`.

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
        onAddGroup={handleAddGroup}
        onDeleteGroup={handleDeleteGroup}
        onRenameGroup={handleRenameGroup}
        onToggleGroupVisibility={handleToggleGroupVisibility}
        onSetGroupColor={handleSetGroupColor}

        onCopySpecular={handleCopySpecular}
        onClearSelection={handleClear}
        onInverseSelection={handleInverseSelection}

        onExport={handleExport}
        onImportJSON={handleImportJSON}
        onUploadClick={handleUpload}

        dotColor={dotColor}
        setDotColor={setDotColor}
      />

      <CanvasArea
        imageSrc={loading ? null : imageSrc}
        landmarks={landmarks}
        groups={groups} // Changed from `selection`
        activeGroupId={activeGroupId} // To maybe highlight active group more?
        brushSize={brushSize}
        mode={mode}
        onSelectionChange={handleSelectionChange}
        onImageLoaded={handleImageLoaded}
        dotColor={dotColor}
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
