import React from 'react';
import { GeneratedImage } from '../types';

interface ResultCardProps {
  result: GeneratedImage;
  onDownload: () => void;
  onRefine: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, onDownload, onRefine }) => {
  const isSmartMatch = result.prompt.includes("智能匹配");

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 flex flex-col h-full animate-fade-in-up">
      <div className="relative flex-grow bg-gray-50 min-h-[300px]">
        <img 
          src={result.url} 
          alt={result.prompt} 
          className="w-full h-full object-cover absolute inset-0"
        />
        {isSmartMatch && (
            <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                智能推荐
            </div>
        )}
      </div>
      <div className="p-4 bg-white flex flex-col gap-3">
        <p className="text-sm text-gray-500 line-clamp-2" title={result.prompt}>
          <span className="font-semibold text-gray-700">
            219发廊：
          </span> {result.prompt}
        </p>
        
        <div className="flex gap-2 mt-auto pt-2">
          <button 
            onClick={onRefine}
            className="flex-1 py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-1 border border-purple-200"
            title="使用此图片继续设计"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            在此基础上修改
          </button>
          
          <button 
            onClick={onDownload}
            className="flex-1 py-2 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-1 border border-gray-200"
            title="保存到本地"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            下载
          </button>
        </div>
      </div>
    </div>
  );
};