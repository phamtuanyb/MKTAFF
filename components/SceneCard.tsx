
import React, { useState } from 'react';
import { Scene } from '../types';

interface SceneCardProps {
  scene: Scene;
  ratio?: string;
  onRegenerate?: (sceneId: number) => Promise<void>;
}

const SceneCard: React.FC<SceneCardProps> = ({ scene, ratio = '9:16', onRegenerate }) => {
  const [copied, setCopied] = useState<'image' | 'video' | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleCopy = (text: string, type: 'image' | 'video') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = scene.image_url;
    link.download = `MKT-AFFILIATE-Scene-${scene.scene_id}.png`;
    link.click();
  };

  const onTryAgain = async () => {
    if (!onRegenerate) return;
    setIsRegenerating(true);
    try {
      await onRegenerate(scene.scene_id);
    } finally {
      setIsRegenerating(false);
    }
  };

  const ratioClass = ratio === '9:16' ? 'aspect-[9/16]' : 'aspect-[16/9]';

  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-100 transition-all hover:shadow-xl hover:shadow-indigo-50/50 flex flex-col h-full group">
      <div className={`relative overflow-hidden ${ratioClass}`}>
        {isRegenerating && (
          <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
            <i className="fas fa-sync fa-spin text-indigo-600 text-2xl mb-2"></i>
            <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Đang vẽ lại...</p>
          </div>
        )}
        <img 
          src={scene.image_url} 
          alt={scene.scene_name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end p-4 gap-2">
           <button 
            onClick={onTryAgain}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black transition-all hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg"
           >
             <i className="fas fa-redo-alt"></i> THỬ LẠI CẢNH NÀY
           </button>
           <button 
            onClick={handleDownload}
            className="w-full py-2.5 bg-white text-slate-900 rounded-xl text-[10px] font-black transition-all hover:bg-indigo-50 flex items-center justify-center gap-2"
           >
             <i className="fas fa-download"></i> TẢI ẢNH
           </button>
        </div>
        <div className="absolute top-4 left-4 px-4 py-1.5 bg-white/90 backdrop-blur-md border border-white rounded-full text-[10px] font-black text-indigo-900 shadow-sm uppercase tracking-widest">
          Cảnh {scene.scene_id}
        </div>
      </div>

      <div className="p-5 flex-grow flex flex-col space-y-4">
        <div>
           <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">TRẠNG THÁI: VIDEO READY</p>
           <h3 className="text-lg font-black text-slate-900 leading-tight">{scene.scene_name}</h3>
        </div>
        
        <div className="space-y-4 flex-grow">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prompt Ảnh AI</span>
              <button 
                onClick={() => handleCopy(scene.image_prompt.content, 'image')}
                className={`text-[9px] font-black transition-all flex items-center gap-1.5 ${copied === 'image' ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
              >
                {copied === 'image' ? <><i className="fas fa-check-circle"></i> XONG</> : <><i className="fas fa-copy"></i> CHÉP</>}
              </button>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[11px] text-slate-600 italic leading-relaxed line-clamp-2">
                "{scene.image_prompt.content}"
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Video (8s)</span>
              <button 
                onClick={() => handleCopy(scene.video_prompt.content, 'video')}
                className={`text-[9px] font-black transition-all flex items-center gap-1.5 ${copied === 'video' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}
              >
                {copied === 'video' ? <><i className="fas fa-check-circle"></i> XONG</> : <><i className="fas fa-copy"></i> CHÉP</>}
              </button>
            </div>
            <div className="p-2.5 bg-emerald-50/30 rounded-lg border border-emerald-100/50">
              <p className="text-[11px] text-slate-600 italic leading-relaxed line-clamp-2">
                "{scene.video_prompt.content}"
              </p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
             <i className="fas fa-lock text-[7px] text-indigo-400"></i>
          </div>
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">V5 Detail Lock</span>
        </div>
      </div>
    </div>
  );
};

export default SceneCard;