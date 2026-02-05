
import React from 'react';
import { Trash2, Copy, Download, Upload, Plus, Minus, Edit2, Check, X, Eye, EyeOff } from 'lucide-react';

export interface SelectionGroup {
    id: string;
    name: string;
    indices: Set<number>;
    visible: boolean;
    color: string;
}

interface SidebarProps {
    brushSize: number;
    setBrushSize: (size: number) => void;
    mode: 'add' | 'subtract';
    setMode: (mode: 'add' | 'subtract') => void;

    // Group Management
    groups: SelectionGroup[];
    activeGroupId: string;
    onSetActiveGroup: (id: string) => void;
    onAddGroup: () => void;
    onDeleteGroup: (id: string) => void;
    onRenameGroup: (id: string, newName: string) => void;
    onToggleGroupVisibility: (id: string) => void;
    onSetGroupColor: (id: string, color: string) => void;

    // Actions on Active Group
    onCopySpecular: () => void;
    onClearSelection: () => void;
    onInverseSelection: () => void;

    // Data
    onExport: () => void;
    onImportJSON: () => void;

    // Global
    onUploadClick: () => void;
    dotColor: 'white' | 'black';
    setDotColor: (color: 'white' | 'black') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    brushSize,
    setBrushSize,
    mode,
    setMode,
    groups,
    activeGroupId,
    onSetActiveGroup,
    onAddGroup,
    onDeleteGroup,
    onRenameGroup,
    onToggleGroupVisibility,
    onSetGroupColor,
    onCopySpecular,
    onClearSelection,
    onInverseSelection,
    onExport,
    onImportJSON,
    onUploadClick,
    dotColor,
    setDotColor
}) => {
    const activeGroup = groups.find(g => g.id === activeGroupId);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editName, setEditName] = React.useState('');

    const startEditing = (g: SelectionGroup) => {
        setEditingId(g.id);
        setEditName(g.name);
    };

    const saveEditing = () => {
        if (editingId && editName.trim()) {
            onRenameGroup(editingId, editName.trim());
        }
        setEditingId(null);
    };

    return (
        <div className="sidebar">
            <h1>FaceMesh Selector</h1>

            {/* Groups Section */}
            <div className="control-group groups-list" style={{ flex: 1, overflowY: 'auto', minHeight: '150px', maxHeight: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label>Groups</label>
                    <button onClick={onAddGroup} className="small-icon" title="Add Group">
                        <Plus size={14} />
                    </button>
                </div>

                <div className="group-items" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {groups.map(g => (
                        <div
                            key={g.id}
                            className={`group-item ${g.id === activeGroupId ? 'active' : ''}`}
                            onClick={() => onSetActiveGroup(g.id)}
                            style={{
                                padding: '8px',
                                border: `1px solid ${g.id === activeGroupId ? g.color : '#333'}`,
                                borderRadius: '4px',
                                backgroundColor: g.id === activeGroupId ? 'rgba(255,255,255,0.05)' : 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <input
                                type="color"
                                value={g.color}
                                onChange={(e) => onSetGroupColor(g.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    padding: 0,
                                    border: 'none',
                                    borderRadius: '50%',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    flexShrink: 0
                                }}
                                title="Change Color"
                            />

                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleGroupVisibility(g.id); }}
                                className="icon-btn"
                                title={g.visible ? "Hide Group" : "Show Group"}
                                style={{ padding: 0, background: 'none', border: 'none', color: '#888' }}
                            >
                                {g.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>

                            {editingId === g.id ? (
                                <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        onClick={e => e.stopPropagation()}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') saveEditing();
                                            if (e.key === 'Escape') setEditingId(null);
                                        }}
                                        autoFocus
                                        style={{ width: '100%', padding: '2px' }}
                                    />
                                    <button onClick={(e) => { e.stopPropagation(); saveEditing(); }} className="icon-btn"><Check size={12} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="icon-btn"><X size={12} /></button>
                                </div>
                            ) : (
                                <>
                                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: g.id === activeGroupId ? 'bold' : 'normal', opacity: g.visible ? 1 : 0.5 }}>
                                        {g.name} ({g.indices.size})
                                    </span>
                                    <div className="group-actions" style={{ display: 'flex', gap: '2px' }}>
                                        <button onClick={(e) => { e.stopPropagation(); startEditing(g); }} className="icon-btn" title="Rename"><Edit2 size={12} /></button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeleteGroup(g.id); }}
                                            className="icon-btn danger"
                                            title="Delete"
                                            disabled={groups.length <= 1}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="control-group">
                <label>Brush Size: {brushSize}px</label>
                <input
                    type="range"
                    min="1"
                    max="50"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                />
            </div>

            <div className="control-group">
                <label>Selection Mode</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                        className={mode === 'add' ? 'active' : ''}
                        onClick={() => setMode('add')}
                        title="Add to selection"
                        style={{ flex: 1 }}
                    >
                        <Plus size={16} /> Add
                    </button>
                    <button
                        className={mode === 'subtract' ? 'active' : ''}
                        onClick={() => setMode('subtract')}
                        title="Remove from selection"
                        style={{ flex: 1 }}
                    >
                        <Minus size={16} /> Sub
                    </button>
                </div>
            </div>

            <div className="control-group">
                <label>Dot Color</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                        className={dotColor === 'white' ? 'active' : ''}
                        onClick={() => setDotColor('white')}
                        style={{ flex: 1 }}
                    >
                        White
                    </button>
                    <button
                        className={dotColor === 'black' ? 'active' : ''}
                        onClick={() => setDotColor('black')}
                        style={{ flex: 1 }}
                    >
                        Black
                    </button>
                </div>
            </div>

            <div className="control-group">
                <label>Actions (Active Group)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    <button onClick={onCopySpecular} className="small" title="Copy Specular">
                        <Copy size={14} /> Specular
                    </button>
                    <button onClick={onInverseSelection} className="small" title="Inverse">
                        <Copy size={14} style={{ transform: 'scaleX(-1)' }} /> Inverse
                    </button>
                    <button onClick={onClearSelection} className="danger small" title="Clear">
                        <Trash2 size={14} /> Clear
                    </button>
                </div>
            </div>

            <div className="control-group">
                <label>Data</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    <button onClick={onExport} style={{ flex: 1 }}>
                        <Download size={14} /> Export All
                    </button>
                    <button onClick={onImportJSON} style={{ flex: 1 }}>
                        <Upload size={14} /> Import JSON
                    </button>
                </div>
                <button onClick={onUploadClick} style={{ marginTop: '5px', width: '100%' }}>
                    <Upload size={14} /> New Image
                </button>
            </div>

            <div className="control-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100px' }}>
                <label>Active Selection Indices</label>
                <textarea
                    readOnly
                    value={activeGroup ? Array.from(activeGroup.indices).sort((a, b) => a - b).join(', ') : ''}
                    style={{
                        flex: 1,
                        backgroundColor: '#111',
                        color: '#aaa',
                        border: '1px solid #333',
                        padding: '5px',
                        fontSize: '0.8rem',
                        resize: 'none'
                    }}
                />
            </div>

            <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: '#666' }}>
                <p>Left Click + Drag to Select</p>
                <p>Middle Click to Pan</p>
                <p>Double Click Name to Rename</p>
            </div>
        </div>
    );
};
