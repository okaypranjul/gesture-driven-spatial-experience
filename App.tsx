
import React, { useState, useRef, useCallback } from 'react';
import { HandTracker } from './components/HandTracker';
import { ShowreelScene } from './components/ShowreelScene';
import { HandData, ShowreelItem } from './types';
import { MOCK_ITEMS } from './constants';

const App: React.FC = () => {
  // Use a ref for hand data to achieve 60fps without React state overhead
  const handDataRef = useRef<HandData>({
    present: false,
    distance: 0.1,
    position: { x: 0.5, y: 0.5 }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<ShowreelItem[]>(MOCK_ITEMS);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newItems: ShowreelItem[] = Array.from(files).map((file, i) => ({
      id: `custom-${i}-${Date.now()}`,
      url: URL.createObjectURL(file),
      title: file.name,
      category: "Upload"
    }));

    // If the user uploads very few images, we repeat them to keep the sphere full and beautiful
    let processedItems = newItems;
    if (newItems.length > 0 && newItems.length < 30) {
      processedItems = [];
      while (processedItems.length < 60) {
        processedItems.push(...newItems.map(item => ({...item, id: `${item.id}-${processedItems.length}`})));
      }
    }

    setItems(processedItems);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-white overflow-hidden">
      {/* 3D Scene Background - Consumes handDataRef directly for performance */}
      <ShowreelScene handDataRef={handDataRef} items={items} />

      {/* Hand Tracker Component - Centered at bottom, updates the ref directly */}
      <HandTracker 
        active={true} 
        handDataRef={handDataRef}
        onLoaded={() => setIsLoading(false)}
      />

      {/* Upload Button */}
      {!isLoading && (
        <div className="absolute top-6 left-6 z-10">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-md border border-black/5 shadow-lg rounded-full hover:bg-white hover:scale-105 transition-all active:scale-95 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-neutral-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="text-sm font-medium text-neutral-800">Upload Images</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            multiple 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      )}

      {/* Loading State Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-[3px] border-neutral-100 border-t-neutral-900 rounded-full animate-spin" />
            <span className="text-xs font-medium tracking-widest text-neutral-400 uppercase">Initializing Camera</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
