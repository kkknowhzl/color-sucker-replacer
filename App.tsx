import React, { useState, useRef } from 'react';
import { Upload, Pipette, Ruler, Trash2, Sparkles, Info, AlertCircle, History, X } from 'lucide-react';
import { ImageCanvas } from './components/ImageCanvas';
import { ToolMode, ColorData, MeasurementData, AIAnalysisResult } from './types';
import { analyzeColorContext } from './services/geminiService';

export default function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [mode, setMode] = useState<ToolMode>(ToolMode.COLOR_PICKER);
  
  // Data State
  const [selectedColor, setSelectedColor] = useState<ColorData | null>(null);
  const [colorHistory, setColorHistory] = useState<ColorData[]>([]);
  
  const [measurement, setMeasurement] = useState<MeasurementData | null>(null);
  const [aiResult, setAiResult] = useState<AIAnalysisResult>({ description: '', loading: false });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          setImageSrc(event.target.result);
          // Reset states
          setSelectedColor(null);
          setColorHistory([]);
          setMeasurement(null);
          setAiResult({ description: '', loading: false });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorPicked = (color: ColorData) => {
    setSelectedColor(color);
    // Reset AI when a new fresh pick is made
    setAiResult({ description: '', loading: false });
    
    setColorHistory(prev => {
      const newHistory = [color, ...prev];
      // Keep last 20 items
      return newHistory.slice(0, 20);
    });
  };

  const handleRestoreColor = (color: ColorData) => {
    setSelectedColor(color);
    // Clear AI result as context might have changed or user might want to re-analyze this specific one
    setAiResult({ description: '', loading: false });
  };

  const handleAnalyzeWithAI = async () => {
    if (!imageSrc || !selectedColor) return;

    setAiResult({ description: '', loading: true, error: undefined });
    try {
      const text = await analyzeColorContext(
        imageSrc, 
        selectedColor.x, 
        selectedColor.y, 
        selectedColor.hex
      );
      setAiResult({ description: text, loading: false });
    } catch (e: any) {
      setAiResult({ description: '', loading: false, error: e.message || "Analysis failed" });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700 shadow-md z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="font-bold text-white">V</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">VisionMatrix</h1>
        </div>
        
        <div className="flex items-center space-x-4">
           {!imageSrc && (
             <span className="text-sm text-slate-400 hidden sm:inline">Upload an image to begin analysis</span>
           )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Image
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileUpload}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden relative">
        
        {!imageSrc ? (
          // Empty State
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 border-2 border-dashed border-slate-700 m-8 rounded-2xl hover:bg-slate-800/50 transition-colors cursor-pointer"
               onClick={() => fileInputRef.current?.click()}>
            <div className="p-6 bg-slate-800 rounded-full mb-6">
              <Upload className="w-12 h-12 text-blue-400" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Drop your image here</h2>
            <p className="text-slate-400 max-w-md text-center">
              Upload an image to identify colors, measure distances, and get AI-powered insights.
            </p>
          </div>
        ) : (
          <>
            {/* Toolbar (Left) */}
            <aside className="w-20 flex flex-col items-center py-6 bg-slate-800 border-r border-slate-700 space-y-6 z-10">
              <ToolButton 
                icon={<Pipette className="w-6 h-6" />} 
                label="Color" 
                active={mode === ToolMode.COLOR_PICKER}
                onClick={() => setMode(ToolMode.COLOR_PICKER)}
              />
              <ToolButton 
                icon={<Ruler className="w-6 h-6" />} 
                label="Measure" 
                active={mode === ToolMode.MEASURE}
                onClick={() => {
                  setMode(ToolMode.MEASURE);
                  setMeasurement(null); // Clear previous measure on switch
                }}
              />
            </aside>

            {/* Workspace (Center) */}
            <div className="flex-1 relative bg-slate-950 overflow-hidden flex items-center justify-center p-4">
              <div className="relative shadow-2xl ring-1 ring-slate-700 max-h-full max-w-full">
                 <ImageCanvas
                    imageSrc={imageSrc}
                    mode={mode}
                    selectedPoint={selectedColor ? { x: selectedColor.x, y: selectedColor.y } : null}
                    onColorPicked={handleColorPicked}
                    onMeasurementUpdate={setMeasurement}
                 />
              </div>
            </div>

            {/* Info Panel (Right) */}
            <aside className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden z-10">
              <div className="p-5 border-b border-slate-700 flex-shrink-0">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Inspector
                </h3>
                <p className="text-lg font-medium text-white">
                  {mode === ToolMode.COLOR_PICKER ? 'Color Analysis' : 'Measurement'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                {/* Color Mode UI */}
                {mode === ToolMode.COLOR_PICKER && (
                  <>
                    <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                      {!selectedColor ? (
                         <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                           <Pipette className="w-8 h-8 mb-3 opacity-50" />
                           <p className="text-sm">Click anywhere on the image to sample a color.</p>
                         </div>
                      ) : (
                        <div className="space-y-4">
                           {/* Color Preview */}
                           <div className="flex items-center space-x-4">
                             <div 
                               className="w-16 h-16 rounded-lg shadow-inner ring-1 ring-white/10"
                               style={{ backgroundColor: selectedColor.hex }}
                             />
                             <div className="flex-1">
                               <p className="text-2xl font-mono font-bold text-white">{selectedColor.hex}</p>
                               <p className="text-xs text-slate-400 mt-1">
                                 X: {selectedColor.x}, Y: {selectedColor.y}
                               </p>
                             </div>
                           </div>
                           
                           {/* RGB Breakdown */}
                           <div className="grid grid-cols-3 gap-2">
                             <div className="bg-slate-800 p-2 rounded text-center border border-slate-700">
                               <div className="text-[10px] text-slate-500 uppercase font-bold">Red</div>
                               <div className="font-mono font-bold text-red-400 text-lg">{selectedColor.r}</div>
                             </div>
                             <div className="bg-slate-800 p-2 rounded text-center border border-slate-700">
                               <div className="text-[10px] text-slate-500 uppercase font-bold">Green</div>
                               <div className="font-mono font-bold text-green-400 text-lg">{selectedColor.g}</div>
                             </div>
                             <div className="bg-slate-800 p-2 rounded text-center border border-slate-700">
                               <div className="text-[10px] text-slate-500 uppercase font-bold">Blue</div>
                               <div className="font-mono font-bold text-blue-400 text-lg">{selectedColor.b}</div>
                             </div>
                           </div>
                        </div>
                      )}
                    </div>

                    {/* AI Section */}
                    {selectedColor && (
                      <div className="space-y-3">
                        <button
                          onClick={handleAnalyzeWithAI}
                          disabled={aiResult.loading}
                          className={`w-full flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 
                            ${aiResult.loading 
                              ? 'bg-slate-700 text-slate-400 cursor-wait' 
                              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:from-indigo-500 hover:to-purple-500'
                            }`}
                        >
                          {aiResult.loading ? (
                            <span className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Analyzing...
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <Sparkles className="w-4 h-4 mr-2" />
                              Identify with AI
                            </span>
                          )}
                        </button>

                        {aiResult.error && (
                           <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm flex items-start">
                             <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                             {aiResult.error}
                           </div>
                        )}

                        {aiResult.description && (
                          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 animate-in fade-in slide-in-from-bottom-2">
                             <h4 className="text-xs font-bold text-indigo-400 uppercase mb-2">Gemini Intelligence</h4>
                             <p className="text-sm text-slate-200 leading-relaxed">
                               {aiResult.description}
                             </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Color History */}
                    {colorHistory.length > 0 && (
                      <div className="pt-4 border-t border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                           <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                              <History className="w-3 h-3 mr-1.5" />
                              History
                           </div>
                           <button 
                             onClick={() => setColorHistory([])} 
                             className="text-[10px] text-slate-500 hover:text-red-400 transition-colors"
                           >
                             CLEAR
                           </button>
                        </div>
                        <div className="space-y-2">
                          {colorHistory.map((c, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleRestoreColor(c)}
                              className="w-full flex items-center p-2 bg-slate-800/50 rounded-lg border border-slate-700 hover:bg-slate-800 hover:border-slate-600 transition-all group"
                            >
                               <div 
                                 className="w-8 h-8 rounded shadow-sm mr-3 flex-shrink-0 ring-1 ring-white/10" 
                                 style={{ backgroundColor: c.hex }} 
                               />
                               <div className="flex-1 min-w-0 text-left">
                                  <div className="text-xs font-mono text-white group-hover:text-blue-300 transition-colors">{c.hex}</div>
                                  <div className="text-[10px] text-slate-500 flex space-x-2">
                                    <span>R:{c.r}</span>
                                    <span>G:{c.g}</span>
                                    <span>B:{c.b}</span>
                                  </div>
                               </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Measurement Mode UI */}
                {mode === ToolMode.MEASURE && (
                   <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                      {!measurement ? (
                         <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                           <Ruler className="w-8 h-8 mb-3 opacity-50" />
                           <p className="text-sm text-center">Click two points on the image to measure the distance.</p>
                         </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex flex-col items-center py-4 border-b border-slate-800">
                            <span className="text-xs text-slate-500 uppercase">Distance</span>
                            <span className="text-4xl font-bold text-blue-400">
                              {Math.round(measurement.distancePixels)}
                              <span className="text-lg text-slate-500 ml-1">px</span>
                            </span>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-slate-400">
                              <span>Point A</span>
                              <span className="font-mono text-slate-200">
                                {Math.round(measurement.start.x)}, {Math.round(measurement.start.y)}
                              </span>
                            </div>
                            {measurement.end && (
                              <div className="flex justify-between text-slate-400">
                                <span>Point B</span>
                                <span className="font-mono text-slate-200">
                                  {Math.round(measurement.end.x)}, {Math.round(measurement.end.y)}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <button 
                            onClick={() => setMeasurement(null)}
                            className="w-full mt-4 py-2 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Reset Measurement
                          </button>
                        </div>
                      )}
                   </div>
                )}
              </div>
              
              {/* Footer Hint */}
              <div className="p-4 border-t border-slate-700 text-xs text-slate-500 flex items-start bg-slate-800">
                <Info className="w-4 h-4 mr-2 flex-shrink-0" />
                <p>
                  Coordinates are relative to the original image resolution.
                </p>
              </div>
            </aside>
          </>
        )}
      </main>
    </div>
  );
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-2 w-14 h-14 rounded-xl transition-all duration-200 group
      ${active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
        : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100'
      }`}
    title={label}
  >
    {icon}
    <span className={`text-[10px] mt-1 font-medium ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
      {label}
    </span>
  </button>
);