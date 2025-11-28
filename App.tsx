import React, { useState } from 'react';
import { generateHairstyle, analyzeHairStyle } from './services/geminiService';
import { ImagePicker } from './components/ImagePicker';
import { Button } from './components/Button';
import { ResultCard } from './components/ResultCard';
import { AppState, GenerationStatus, GeneratedImage } from './types';

// Ensure styles are available
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-up {
    animation: fade-in-up 0.5s ease-out forwards;
  }
`;
document.head.appendChild(style);

const DEFAULT_PROMPTS = [
  "设计一款适合我脸型的韩式波浪卷发。",
  "换成干练的商务短发，发色为深棕色。",
  "增加刘海，尝试日系清新风格。",
  "将头发染成流行的亚麻灰。",
  "变成复古风格的盘发造型。"
];

type Mode = 'smart' | 'custom';

export default function App() {
  const [state, setState] = useState<AppState>({
    status: GenerationStatus.IDLE,
    userImage: null,
    referenceImage: null,
    generatedImages: [],
    errorMsg: null,
  });

  const [mode, setMode] = useState<Mode>('smart');
  const [customPrompt, setCustomPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!state.referenceImage) return;
    
    setIsAnalyzing(true);
    setCustomPrompt("正在深度分析参考图发型结构，请稍候...");
    
    try {
      const description = await analyzeHairStyle(state.referenceImage);
      setCustomPrompt(description);
    } catch (error: any) {
      setCustomPrompt("");
      setState(prev => ({
        ...prev,
        errorMsg: "无法分析参考图，请重试。"
      }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!state.userImage) return;

    setState(prev => ({ ...prev, status: GenerationStatus.LOADING, errorMsg: null }));

    let finalPrompt = "";
    // In Custom Mode, we now support passing BOTH the reference image and the text description.
    // This allows the model to see the visual style (Image) AND understand the details (Text).
    let refImageToSend: string | undefined = undefined;

    if (mode === 'smart') {
      finalPrompt = "请分析该用户的脸型、五官比例和气质，为其设计一款最适合的、当下最流行的发型。要求发型能修饰脸型，提升整体颜值，风格自然时尚。";
    } else {
      // Custom Mode
      if (customPrompt.trim()) {
         finalPrompt = `请根据以下描述为用户设计发型：${customPrompt}`;
      } else if (state.referenceImage) {
        // Only image, no text provided
        finalPrompt = "请严格复刻参考图中的发型结构、长度和质感，将其移植到用户头上。";
      } else {
        // No image, no text
        finalPrompt = "请根据我的脸型设计一款最适合的时尚发型。";
      }
      
      // Always pass the reference image if it exists in Custom Mode.
      // If the user wants pure text generation, they can clear the reference image.
      if (state.referenceImage) {
        refImageToSend = state.referenceImage;
      }
    }

    try {
      const generatedImageUrl = await generateHairstyle(
        state.userImage, 
        finalPrompt, 
        refImageToSend
      );
      
      // Determine display text for the card
      let displayPrompt = "";
      if (mode === 'smart') {
        displayPrompt = "✨ 智能匹配最佳发型";
      } else {
        displayPrompt = customPrompt.trim() ? customPrompt : "自定义设计";
      }

      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        url: generatedImageUrl,
        prompt: displayPrompt.length > 40 ? displayPrompt.substring(0,40) + "..." : displayPrompt,
        timestamp: Date.now()
      };

      setState(prev => ({
        ...prev,
        status: GenerationStatus.SUCCESS,
        generatedImages: [newImage, ...prev.generatedImages]
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        status: GenerationStatus.ERROR,
        errorMsg: error.message
      }));
    }
  };

  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `hairstyle-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefine = (imageUrl: string) => {
    setState(prev => ({
      ...prev,
      userImage: imageUrl,
      referenceImage: null // Clear reference image as we are focusing on this new base
    }));
    setMode('custom');
    setCustomPrompt(""); // Clear prompt to allow new refinement instructions
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen pb-12 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 text-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white font-bold">
              AI
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-pink-600">
              219发廊
            </h1>
          </div>
          <a href="#" className="text-sm font-medium text-gray-500 hover:text-purple-600 transition-colors">关于我们</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Inputs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl shadow-xl shadow-purple-100 p-6 border border-white">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                第一步：上传头像
              </h2>
              <ImagePicker 
                label="选择您的照片（正面清晰照效果最佳）"
                image={state.userImage}
                onImageSelected={(base64) => setState(prev => ({ ...prev, userImage: base64 }))}
                onClear={() => setState(prev => ({ ...prev, userImage: null }))}
              />
            </div>

            {state.userImage && (
              <div className="bg-white rounded-2xl shadow-xl shadow-purple-100 p-6 border border-white animate-fade-in-up">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-pink-500 rounded-full"></span>
                  第二步：选择设计模式
                </h2>

                <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                  <button
                    onClick={() => setMode('smart')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                      mode === 'smart' 
                      ? 'bg-white text-purple-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    智能匹配
                  </button>
                  <button
                    onClick={() => setMode('custom')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                      mode === 'custom' 
                      ? 'bg-white text-purple-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                    深度定制
                  </button>
                </div>
                
                {mode === 'smart' ? (
                  <div className="space-y-4">
                     <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 text-purple-800 text-sm">
                       <p className="font-semibold mb-1">🤖 AI 智能分析</p>
                       <p>系统将自动分析您的脸型特征、五官比例，为您匹配一款最适合的潮流发型。</p>
                     </div>
                     <Button 
                      className="w-full py-3 text-lg shadow-purple-200 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 border-none text-white"
                      isLoading={state.status === GenerationStatus.LOADING}
                      onClick={handleGenerate}
                    >
                      ✨ 一键智能生成
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in-up">
                    <ImagePicker 
                      label="（可选）上传参考图："
                      image={state.referenceImage}
                      onImageSelected={(base64) => setState(prev => ({ ...prev, referenceImage: base64 }))}
                      onClear={() => setState(prev => ({ ...prev, referenceImage: null }))}
                    />

                    {state.referenceImage && (
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="secondary" 
                          onClick={handleAnalyze} 
                          isLoading={isAnalyzing}
                          className="w-full border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100"
                        >
                           🪄 提取参考图发型描述
                        </Button>
                        <p className="text-xs text-gray-500 px-1">
                          提示：保留参考图可让AI严格参考其视觉结构；若只需参考文字描述，请在分析后清除图片。
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">定制需求描述：</label>
                      <textarea 
                        className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-shadow resize-none bg-gray-50 focus:bg-white"
                        rows={5}
                        placeholder={state.referenceImage ? "点击上方按钮分析参考图，或手动输入描述..." : "例如：帮我设计一个显脸小的短发，染成焦糖色..."}
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                      />
                    </div>

                    <div className="pt-2">
                      <Button 
                        className="w-full py-3 text-lg shadow-purple-200"
                        isLoading={state.status === GenerationStatus.LOADING}
                        onClick={handleGenerate}
                      >
                        生成定制发型
                      </Button>
                    </div>

                    {/* Quick Prompts */}
                    {!state.referenceImage && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">灵感标签</p>
                        <div className="flex flex-wrap gap-2">
                          {DEFAULT_PROMPTS.map((p, i) => (
                            <button
                              key={i}
                              onClick={() => setCustomPrompt(p)}
                              className="text-xs bg-gray-100 hover:bg-purple-100 text-gray-600 hover:text-purple-700 px-3 py-1.5 rounded-full transition-colors text-left"
                            >
                              {p.length > 10 ? p.substring(0, 10) + '...' : p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel: Results */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between mb-2">
               <h2 className="text-xl font-bold text-gray-800">设计成果</h2>
               {state.generatedImages.length > 0 && (
                 <span className="text-sm text-gray-500">已生成 {state.generatedImages.length} 款发型</span>
               )}
            </div>

            {state.status === GenerationStatus.ERROR && state.errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <h3 className="font-semibold">出错了</h3>
                  <p className="text-sm mt-1">{state.errorMsg}</p>
                </div>
              </div>
            )}

            {state.status === GenerationStatus.LOADING && (
              <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center justify-center min-h-[400px] border border-gray-100">
                <div className="relative w-24 h-24 mb-6">
                   <div className="absolute inset-0 border-4 border-purple-100 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center text-2xl">✂️</div>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {mode === 'smart' ? 'AI正在智能分析脸型...' : '正在定制您的发型...'}
                </h3>
                <p className="text-gray-500 text-sm mt-2 text-center max-w-xs">
                  Gemini 2.5 Flash 正在为您生成最匹配的造型，请稍候。
                </p>
              </div>
            )}

            {state.generatedImages.length === 0 && state.status !== GenerationStatus.LOADING && (
               <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center justify-center min-h-[400px] border border-dashed border-gray-300">
                 <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                 </div>
                 <p className="text-gray-400 font-medium">
                   {state.userImage ? "请在左侧选择模式并开始设计" : "请先上传一张您的头像"}
                 </p>
               </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {state.generatedImages.map((img) => (
                <ResultCard 
                  key={img.id} 
                  result={img} 
                  onDownload={() => handleDownload(img.url)}
                  onRefine={() => handleRefine(img.url)}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="mt-20 border-t border-gray-200 py-8 bg-white text-center text-sm text-gray-400">
        <p>&copy; 2024 219 Salon. Powered by Gemini 2.5 Flash Image.</p>
      </footer>
    </div>
  );
}