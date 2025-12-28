interface BatchActionBarProps {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onClearSelection: () => void;
    onBatchProcess: () => void;
    onBatchDelete: () => void;
    onBatchExportSRT: () => void;
    isProcessing?: boolean;
}

export function BatchActionBar({
    selectedCount,
    totalCount,
    onSelectAll,
    onClearSelection,
    onBatchProcess,
    onBatchDelete,
    onBatchExportSRT,
    isProcessing
}: BatchActionBarProps) {
    if (selectedCount === 0) {
        // Hidden standard 'Select All' for a cleaner look, can be added back to header if needed
        // Or just show a simple bar
        return (
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 text-xs text-gray-500 flex justify-between">
                    <span>共 {totalCount} 个视频</span>
                    <button onClick={onSelectAll} className="hover:text-blue-600">全选</button>
                </div>
            </div>
        );
    }

    return (
        <div className="sticky top-16 z-20 bg-blue-50 border-b border-blue-100 shadow-sm animate-in slide-in-from-top-2 duration-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-blue-900">
                        已选择 {selectedCount} 项
                    </span>
                    <button
                        onClick={onClearSelection}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        取消
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={onBatchProcess} disabled={isProcessing} className="bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded shadow-sm text-sm font-medium transition-colors">
                        批量处理
                    </button>
                    <button onClick={onBatchExportSRT} className="bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded shadow-sm text-sm font-medium transition-colors">
                        导出 字幕
                    </button>
                    <button onClick={onBatchDelete} className="bg-white text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded shadow-sm text-sm font-medium transition-colors">
                        删除
                    </button>
                </div>
            </div>
        </div>
    );
}
