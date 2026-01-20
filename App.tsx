
import React, { useState, useEffect } from 'react';
import { VideoStyle, GenerationRequest, Scene } from './types';
import { STYLE_CONFIGS, ASPECT_RATIOS } from './constants';
import SceneCard from './components/SceneCard';
import { generateStoryboard, generateSingleSceneImage } from './services/geminiService';
import JSZip from 'jszip';

const App: React.FC = () => {
  const [selectedStyle, setSelectedStyle] = useState<VideoStyle>(VideoStyle.UNBOX_SHOW);
  const [selectedRatio, setSelectedRatio] = useState<string>('9:16');
  
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [outfitImage, setOutfitImage] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  
  const [bgPresetType, setBgPresetType] = useState<'PRIVATE' | 'PUBLIC' | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [history, setHistory] = useState<GenerationRequest[]>([]);
  const [currentRequest, setCurrentRequest] = useState<GenerationRequest | null>(null);

  const PRIVATE_PRESETS = [
    "Phòng sinh hoạt cá nhân ánh sáng buổi sáng",
    "Phòng ngủ tối giản, ánh sáng cửa sổ",
    "Căn hộ studio phong cách Nhật",
    "Phòng thay đồ nhỏ gọn, gương đứng",
    "Phòng khách căn hộ chung cư yên tĩnh",
    "Không gian làm việc tại nhà",
    "Phòng đọc sách riêng tư",
    "Căn hộ loft nhỏ, trần cao",
    "Phòng sinh hoạt cá nhân buổi chiều",
    "Phòng riêng ánh sáng đèn vàng ấm"
  ];

  const PUBLIC_PRESETS = [
    "Sảnh chung cư hiện đại",
    "Hành lang căn hộ cao cấp",
    "Sảnh khách sạn boutique",
    "Studio chụp ảnh trong nhà",
    "Không gian showroom thời trang",
    "Khu sinh hoạt chung tòa nhà",
    "Sảnh văn phòng nhỏ",
    "Không gian co-working yên tĩnh",
    "Phòng trưng bày sản phẩm",
    "Không gian triển lãm nhỏ"
  ];

  useEffect(() => {
    const saved = localStorage.getItem('mkt_affiliate_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
        localStorage.removeItem('mkt_affiliate_history');
      }
    }
  }, []);

  const saveHistoryToStorage = (updatedHistory: GenerationRequest[]) => {
    try {
      const storageFriendlyHistory = updatedHistory.map(req => ({
        ...req,
        referenceImage: undefined,
        scenes: req.scenes.map(s => ({
          ...s,
          image_url: 'https://picsum.photos/400/700'
        }))
      })).slice(0, 10);

      localStorage.setItem('mkt_affiliate_history', JSON.stringify(storageFriendlyHistory));
    } catch (e) {
      console.warn("Storage quota exceeded, clearing old history");
      localStorage.removeItem('mkt_affiliate_history');
    }
  };

  const handleFileUpload = (setter: React.Dispatch<React.SetStateAction<string | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!characterImage || !outfitImage) {
      alert("Vui lòng tải lên ít nhất Ảnh Nhân Vật và Ảnh Trang Phục.");
      return;
    }

    setIsGenerating(true);
    try {
      const finalBackground = backgroundImage || selectedPreset || PRIVATE_PRESETS[0];
      const scenes = await generateStoryboard(selectedStyle, characterImage, outfitImage, finalBackground);

      const newRequest: GenerationRequest = {
        id: Math.random().toString(36).substr(2, 9),
        style: selectedStyle,
        timestamp: Date.now(),
        scenes,
        referenceImage: characterImage
      };
      
      setCurrentRequest(newRequest);
      const updatedHistory = [newRequest, ...history].slice(0, 15);
      setHistory(updatedHistory);
      saveHistoryToStorage(updatedHistory);
    } catch (error) {
      console.error(error);
      alert("Lỗi khi tạo kịch bản. Vui lòng thử lại.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateScene = async (sceneId: number) => {
    if (!currentRequest || !characterImage || !outfitImage) {
      alert("Cần ảnh gốc để tạo lại. Vui lòng không làm mới trang giữa chừng.");
      return;
    }

    try {
      const sceneIndex = currentRequest.scenes.findIndex(s => s.scene_id === sceneId);
      if (sceneIndex === -1) return;

      const finalBackground = backgroundImage || selectedPreset || PRIVATE_PRESETS[0];
      const updatedScene = await generateSingleSceneImage(
        sceneIndex,
        currentRequest.scenes[sceneIndex],
        characterImage,
        outfitImage,
        finalBackground
      );

      const updatedScenes = [...currentRequest.scenes];
      updatedScenes[sceneIndex] = updatedScene;

      const updatedRequest = { ...currentRequest, scenes: updatedScenes };
      setCurrentRequest(updatedRequest);
      
      const updatedHistory = history.map(h => h.id === currentRequest.id ? updatedRequest : h);
      setHistory(updatedHistory);
      saveHistoryToStorage(updatedHistory);
    } catch (error) {
      console.error("Regenerate error:", error);
      alert("Không thể tạo lại cảnh này. Vui lòng thử lại.");
    }
  };

  const downloadAllImagesAsZip = async () => {
    if (!currentRequest) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("MKT-AFFILIATE-Images");
      
      for (const scene of currentRequest.scenes) {
        const base64Data = scene.image_url.split(',')[1];
        if (base64Data) {
          folder?.file(`Scene-${scene.scene_id}_${scene.scene_name.replace(/\s+/g, '_')}.png`, base64Data, { base64: true });
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MKT-AFFILIATE-Storyboard-${currentRequest.id}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Zip error:", err);
      alert("Lỗi khi tạo file ZIP.");
    } finally {
      setIsZipping(false);
    }
  };

  const downloadAllPrompts = (type: 'image' | 'video') => {
    if (!currentRequest) return;
    const content = currentRequest.scenes.map(s => 
      `CẢNH ${s.scene_id} (${s.scene_name}):\n${type === 'image' ? s.image_prompt.content : s.video_prompt.content}\n`
    ).join('\n---\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MKT-AFFILIATE-Prompts-${type}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-[400px] bg-white border-r border-slate-200 p-6 flex flex-col h-auto md:h-screen sticky top-0 overflow-y-auto custom-scrollbar shadow-sm">
        <div className="flex flex-col gap-1 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <i className="fas fa-microchip text-2xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-indigo-900">MKT AFFILIATE</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Làm Affiliate Đa Kênh</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Input Section */}
          <section className="space-y-4">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <i className="fas fa-cloud-upload-alt text-indigo-500"></i>
              Nhập liệu MKT AFFILIATE
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Nhân vật', icon: 'fa-user', state: characterImage, setter: setCharacterImage, id: 'char' },
                { label: 'Trang phục', icon: 'fa-tshirt', state: outfitImage, setter: setOutfitImage, id: 'outfit' },
                { label: 'Bối cảnh', icon: 'fa-mountain', state: backgroundImage, setter: setBackgroundImage, id: 'bg' }
              ].map((item) => (
                <div key={item.id} className="space-y-2">
                  <div 
                    className={`relative aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center bg-slate-50 overflow-hidden cursor-pointer transition-all duration-300 ${item.state ? 'border-indigo-500 bg-white ring-4 ring-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-white'}`}
                    onClick={() => document.getElementById(`${item.id}-upload`)?.click()}
                  >
                    {item.state ? <img src={item.state} className="w-full h-full object-cover" /> : <i className={`fas ${item.icon} text-slate-300 text-xl`}></i>}
                    <input id={`${item.id}-upload`} type="file" className="hidden" accept="image/*" onChange={handleFileUpload(item.setter)} />
                  </div>
                  <p className="text-[9px] text-center font-bold text-slate-500 uppercase">{item.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* System Background Section - Fixed Visibility */}
          {!backgroundImage && (
            <section className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Gợi ý bối cảnh hệ thống</label>
              <div className="flex gap-2 p-1 bg-white/50 rounded-xl border border-slate-100">
                {['PRIVATE', 'PUBLIC'].map(type => (
                  <button 
                    key={type}
                    onClick={() => { setBgPresetType(type as any); setSelectedPreset((type === 'PRIVATE' ? PRIVATE_PRESETS : PUBLIC_PRESETS)[0]); }}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${bgPresetType === type ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                    {type === 'PRIVATE' ? 'RIÊNG TƯ' : 'CÔNG CỘNG'}
                  </button>
                ))}
              </div>
              {bgPresetType && (
                <div className="relative">
                  <select 
                    className="w-full p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm text-xs font-bold text-slate-700 outline-none appearance-none focus:ring-2 focus:ring-indigo-500/20"
                    value={selectedPreset || ''}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                  >
                    {(bgPresetType === 'PRIVATE' ? PRIVATE_PRESETS : PUBLIC_PRESETS).map((p, idx) => (
                      <option key={idx} value={p} className="bg-white text-slate-800 py-2">
                        {p}
                      </option>
                    ))}
                  </select>
                  <i className="fas fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]"></i>
                </div>
              )}
            </section>
          )}

          {/* Configuration Section */}
          <section className="space-y-4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Cấu hình kịch bản</label>
            <div className="space-y-3">
              <div className="relative">
                <select 
                  className="w-full p-4 rounded-2xl bg-slate-50 border-none text-sm font-bold text-slate-700 outline-none appearance-none focus:ring-2 focus:ring-indigo-500"
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value as VideoStyle)}
                >
                  {(Object.keys(STYLE_CONFIGS) as VideoStyle[]).map(s => (
                    <option key={s} value={s}>{STYLE_CONFIGS[s].name}</option>
                  ))}
                </select>
                <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
              </div>
              <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setSelectedRatio(ratio)}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${selectedRatio === ratio ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Action Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !characterImage || !outfitImage}
            className={`w-full py-5 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 tracking-tight ${isGenerating || !characterImage || !outfitImage ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}
          >
            {isGenerating ? <><i className="fas fa-spinner fa-spin"></i> ĐANG XỬ LÝ...</> : <><i className="fas fa-magic"></i> TẠO KHUNG HÌNH VIDEO</>}
          </button>
        </div>

        {/* History Section */}
        <div className="mt-auto pt-8 border-t border-slate-100">
          <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Lịch sử MKT AFFILIATE</h4>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
            {history.map((req) => (
              <button
                key={req.id}
                onClick={() => setCurrentRequest(req)}
                className={`w-full text-left p-3 rounded-2xl transition-all duration-200 border ${currentRequest?.id === req.id ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100' : 'bg-white border-slate-100 hover:border-slate-200'}`}
              >
                <div className="flex justify-between items-start gap-2">
                   <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden bg-slate-100">
                      {req.referenceImage ? (
                        <img src={req.referenceImage} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-200">
                          <i className="fas fa-history text-slate-400 text-[10px]"></i>
                        </div>
                      )}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className={`text-[11px] font-bold truncate ${currentRequest?.id === req.id ? 'text-indigo-900' : 'text-slate-700'}`}>{STYLE_CONFIGS[req.style].name}</p>
                     <p className="text-[9px] text-slate-400 mt-0.5">{new Date(req.timestamp).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</p>
                   </div>
                </div>
              </button>
            ))}
            {history.length === 0 && <p className="text-[10px] text-slate-300 text-center py-4 font-bold uppercase italic tracking-widest">Trống</p>}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto bg-[#f8fafc]">
        {!currentRequest && !isGenerating ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto">
            <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100 flex items-center justify-center mb-10 rotate-6 border border-slate-50">
              <i className="fas fa-bolt text-5xl text-indigo-600"></i>
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tighter uppercase">MKT AFFILIATE</h2>
            <p className="text-slate-500 leading-relaxed mb-10 text-lg font-medium">
              "Một nhân vật - Một trang phục - Một bối cảnh xuyên suốt 5 khung hình chuyên nghiệp với công nghệ <span className="text-indigo-600 font-bold underline decoration-2 underline-offset-4">AI LÀM AFFILIATE </span>."
            </p>
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="p-6 md:p-8 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 text-left transition-transform hover:scale-[1.02]">
                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1.5 opacity-70">Tư vấn kỹ thuật</p>
                <p className="text-3xl font-black text-slate-900 tracking-tighter">0941.113.119</p>
              </div>
              <div className="p-6 md:p-8 bg-indigo-600 rounded-[2rem] text-left text-white shadow-2xl shadow-indigo-200 transition-transform hover:scale-[1.02]">
                <p className="text-[9px] font-black text-white/60 uppercase tracking-[0.2em] mb-1.5">Làm Affiliate Đa Kênh</p>
                <p className="text-3xl font-black tracking-tighter">MKT AFFILIATE</p>
              </div>
            </div>
          </div>
        ) : isGenerating ? (
          <div className="h-full flex flex-col items-center justify-center">
             <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <i className="fas fa-dna text-indigo-600 text-2xl animate-pulse"></i>
                </div>
             </div>
             <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-3 animate-pulse">MKT AFFILIATE</h2>
             <p className="text-slate-500 font-bold tracking-widest uppercase text-[11px]">Đang khớp Identity & Dựng Pipeline V5...</p>
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
              <div className="space-y-2">
                <nav className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="text-indigo-600">MKT AFFILIATE</span>
                  <i className="fas fa-chevron-right text-[8px] opacity-30"></i>
                  <span>PIPELINE THƯƠNG MẠI #1</span>
                </nav>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">{STYLE_CONFIGS[currentRequest!.style].name}</h2>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                 <button onClick={downloadAllImagesAsZip} disabled={isZipping} className="px-5 py-3 bg-indigo-600 text-white rounded-2xl text-[11px] font-black hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg disabled:bg-slate-300">
                   {isZipping ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-archive"></i>} TẢI ZIP ẢNH THEO THỨ TỰ
                 </button>
                 <button onClick={() => downloadAllPrompts('image')} className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                   <i className="fas fa-file-alt text-emerald-500"></i> PROMPT ẢNH
                 </button>
                 <button onClick={() => downloadAllPrompts('video')} className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                   <i className="fas fa-file-video text-amber-500"></i> PROMPT VIDEO
                 </button>
              </div>
            </header>

            {/* Results Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {currentRequest!.scenes.map((scene) => (
                <SceneCard 
                  key={scene.scene_id} 
                  scene={scene} 
                  ratio={selectedRatio} 
                  onRegenerate={handleRegenerateScene}
                />
              ))}
            </div>

            {/* Brand CTA Section */}
            <section className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-200/50">
              <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-12">
                <div className="space-y-6 max-w-3xl">
                  <div className="inline-block px-4 py-1.5 bg-indigo-500/20 backdrop-blur-md border border-indigo-400/30 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">MKT AFFILIATE - V5</div>
                  <h3 className="text-3xl font-black tracking-tight leading-tight">Phần Mềm Làm AFFILIATE Đa Kênh.</h3>
                  <p className="text-slate-300 text-lg leading-relaxed font-medium">
                    Quy trình <span className="text-white font-black italic">MKT AFFILIATE 4K</span> giúp doanh nghiệp và nhà sáng tạo nội dung tối ưu 95% thời gian quay chụp.
                  </p>
                  <div className="flex flex-wrap gap-5 mt-4">
                    <a href="https://zalo.me/g/npspnm113" target="_blank" className="flex items-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-xs font-black border border-white/10">
                      <i className="fab fa-whatsapp text-lg"></i> THAM GIA ZALO NHÓM
                    </a>
                    <a href="tel:0941113119" className="flex items-center gap-3 px-8 py-3 bg-white text-indigo-950 rounded-2xl hover:bg-indigo-50 transition-all text-sm font-black shadow-lg">
                      <i className="fas fa-phone-alt"></i> 0941.113.119
                    </a>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 bg-white/5 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/10 shrink-0">
                  <div className="p-4 bg-white/10 rounded-2xl border border-white/10 text-center">
                    <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">Tư vấn kỹ thuật</p>
                    <p className="text-2xl font-black text-white">0941.113.119</p>
                  </div>
                  <div className="p-4 bg-indigo-500/20 rounded-2xl border border-indigo-400/20 text-center">
                    <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">Thương hiệu</p>
                    <p className="text-2xl font-black text-white">MKT AFFILIATE</p>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-4xl font-black mb-1">05</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Cảnh Video</div>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-4xl font-black mb-1">4K</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Chuẩn nét</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-600/30 rounded-full blur-[120px]"></div>
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-400/20 rounded-full blur-[100px]"></div>
            </section>
            
            <footer className="text-center py-10 border-t border-slate-100">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Hệ thống được phát triển bởi MKT AFFILIATE &copy; 2026</p>
            </footer>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default App;
