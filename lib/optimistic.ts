// Optimistic UI update utilities for instant feedback

export interface OptimisticUpdate<T> {
    id: string;
    data: T;
    timestamp: number;
    rollback?: () => void;
}

class OptimisticManager {
    private updates: Map<string, OptimisticUpdate<any>> = new Map();

    addUpdate<T>(id: string, data: T, rollback?: () => void): void {
        this.updates.set(id, {
            id,
            data,
            timestamp: Date.now(),
            rollback,
        });
    }

    getUpdate<T>(id: string): OptimisticUpdate<T> | undefined {
        return this.updates.get(id);
    }

    removeUpdate(id: string): void {
        const update = this.updates.get(id);
        if (update?.rollback) {
            update.rollback();
        }
        this.updates.delete(id);
    }

    rollbackUpdate(id: string): void {
        const update = this.updates.get(id);
        if (update?.rollback) {
            update.rollback();
            this.updates.delete(id);
        }
    }

    clear(): void {
        this.updates.clear();
    }
}

export const optimisticManager = new OptimisticManager();

// React hook for optimistic updates
export function useOptimisticUpdate<T>(
    currentData: T[],
    updateFn: (data: T[] | ((prev: T[]) => T[])) => void
) {
    const applyOptimistic = (newItem: T, tempId: string) => {
        const optimisticData = [...currentData, { ...newItem, id: tempId, _optimistic: true }];
        updateFn(optimisticData);
        return tempId;
    };

    const confirmUpdate = (tempId: string, realId: string, realData: T) => {
        updateFn((prev) =>
            prev.map((item: any) =>
                item.id === tempId ? { ...realData, id: realId } : item
            )
        );
    };

    const rollbackUpdate = (tempId: string) => {
        updateFn((prev) => prev.filter((item: any) => item.id !== tempId));
    };

    return { applyOptimistic, confirmUpdate, rollbackUpdate };
}

