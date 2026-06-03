
import { useState, useCallback } from 'react';
import { useHistory } from './useHistory';
import type { SelectionGroup } from '../components/Sidebar';

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function getRandomColor() {
    const colors = ['#bb86fc', '#03dac6', '#cf6679', '#ffb74d', '#4dd0e1', '#aed581'];
    return colors[Math.floor(Math.random() * colors.length)];
}

const DEFAULT_GROUP: SelectionGroup = { id: '1', name: 'Default', indices: new Set(), visible: true, color: '#bb86fc' };

export function useGroupManager() {
    const { state: groups, set: setGroups, undo, redo, canUndo, canRedo, reset: resetGroups } = useHistory<SelectionGroup[]>([DEFAULT_GROUP]);
    const [activeGroupId, setActiveGroupId] = useState<string>('1');

    const updateGroup = useCallback((id: string, updates: Partial<SelectionGroup>) => {
        setGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    }, [setGroups]);

    const addGroup = useCallback((initialData?: Partial<SelectionGroup>) => {
        const newId = generateId();
        const newGroup: SelectionGroup = {
            id: newId,
            name: initialData?.name || `Group ${groups.length + 1}`,
            indices: initialData?.indices || new Set(),
            visible: initialData?.visible ?? true,
            color: initialData?.color || getRandomColor()
        };
        setGroups(prev => [...prev, newGroup]);
        setActiveGroupId(newId);
    }, [groups.length, setGroups]);

    const deleteGroup = useCallback((id: string) => {
        if (groups.length <= 1) return;

        let nextActiveId = activeGroupId;
        if (activeGroupId === id) {
            const remaining = groups.filter(g => g.id !== id);
            nextActiveId = remaining[0]?.id || '';
        }

        setGroups(prev => prev.filter(g => g.id !== id));
        if (nextActiveId !== activeGroupId) {
            setActiveGroupId(nextActiveId);
        }
    }, [groups, activeGroupId, setGroups]);

    const setGroupIndices = useCallback((id: string, newIndices: Set<number>) => {
        setGroups(prev => prev.map(g => g.id === id ? { ...g, indices: newIndices } : g));
    }, [setGroups]);

    // Batch update for multiple groups (e.g. import)
    const replaceAllGroups = useCallback((newGroups: SelectionGroup[]) => {
        // Just reset history or set new state?
        // User probably expects this to be undoable.
        setGroups(newGroups);
        if (newGroups.length > 0) {
            setActiveGroupId(newGroups[0].id);
        }
    }, [setGroups]);

    // Specialized Logic that was in App.tsx

    // Update indices based on brush mode (Add/Subtract)
    const updateSelection = useCallback((indicesToUpdate: number[], mode: 'add' | 'subtract') => {
        setGroups(prevGroups => {
            return prevGroups.map(g => {
                if (g.id !== activeGroupId) return g;

                const nextIndices = new Set(g.indices);
                let changed = false;

                indicesToUpdate.forEach(idx => {
                    if (mode === 'add') {
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
    }, [activeGroupId, setGroups]);


    return {
        groups,
        activeGroupId,
        setActiveGroupId,

        // Actions
        addGroup,
        deleteGroup,
        updateGroup,
        setGroupIndices,
        replaceAllGroups,
        updateSelection,

        // History
        undo,
        redo,
        canUndo,
        canRedo,
        resetGroups
    };
}
