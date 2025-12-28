import type { Video } from '../types';
import { formatFileSize, formatDuration, formatDate } from '../utils/format';
import { StatusBadge } from './StatusBadge';

interface VideoCardProps {
    video: Video;
    isSelected?: boolean;
    isDeleting?: boolean;
    onToggleSelect?: () => void;
    onView?: () => void;
    onProcess?: () => void;
    onDelete?: () => void;
    onExportSRT?: () => void;
    onRename?: () => void;
}

export function VideoCard({
    video,
    isSelected = false,
    isDeleting = false,
    onToggleSelect,
    onView,
    onProcess,
    onDelete,
    onExportSRT,
    onRename
}: VideoCardProps) {
    return (
        <div
            className={`group relative bg-white rounded-xl border transition-all duration-200 
      ${isSelected
                    ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md bg-indigo-50/10'
                    : 'border-slate-200 hover:border-indigo-200 hover:shadow-soft'
                }`}
        >
            <div className="p-4 flex items-center gap-5">
                {/* Selection Checkbox */}
                <div className="flex-shrink-0 pt-1">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={onToggleSelect}
                        className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer transition-colors"
                    />
                </div>

                {/* Thumbnail */}
                <div className="flex-shrink-0 w-32 h-20 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-slate-50 transition-colors border border-slate-100">
                    <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-slate-900 truncate pr-4 group-hover:text-indigo-600 transition-colors">
                            {video.originalName || video.filename}
                        </h3>
                        <StatusBadge status={video.status} />
                    </div>

                    <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {formatDate(video.uploadedAt)}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span>{formatDuration(video.duration)}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span>{formatFileSize(video.size)}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* Detail button - available for all states */}
                    <button onClick={onView} className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                        {video.status === 'processing' ? '查看进度' : '查看详情'}
                    </button>

                    {/* Action buttons based on status */}
                    {video.status === 'completed' && (
                        <button onClick={onProcess} className="px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
                            Reprocess
                        </button>
                    )}
                    {(video.status === 'pending' || video.status === 'failed') && (
                        <button onClick={onProcess} className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                            Process
                        </button>
                    )}
                    {video.transcriptReady && (
                        <button onClick={onExportSRT} className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                            SRT
                        </button>
                    )}
                    <button onClick={onRename} className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors">
                        ✏️ 重命名
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.();
                        }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${isDeleting
                            ? 'text-white bg-red-600 hover:bg-red-700'
                            : 'text-slate-600 bg-slate-50 hover:bg-red-50 hover:text-red-600'
                            }`}
                    >
                        {isDeleting ? '确认删除？' : '删除'}
                    </button>
                </div>
            </div>
        </div>
    );
}
