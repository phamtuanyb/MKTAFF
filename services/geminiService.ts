
import { GoogleGenAI, Type } from "@google/genai";
import { VideoStyle, Scene } from "../types";
import { STYLE_CONFIGS } from "../constants";

// Use process.env.API_KEY directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Phân tích danh tính và trang phục một lần để dùng chung
export const analyzeIdentity = async (characterImage: string, outfitImage: string) => {
  const analysis = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    // Always use { parts: [...] } for multimodal contents
    contents: {
      parts: [
        { inlineData: { data: characterImage.split(',')[1], mimeType: 'image/png' } },
        { inlineData: { data: outfitImage.split(',')[1], mimeType: 'image/png' } },
        { text: "Phân tích 2 ảnh. Trả về JSON tiếng Việt: { character: { gender: 'nam'|'nữ', hair: 'mô tả tóc', age: 'độ tuổi', original_outfit: 'mô tả đồ gốc nhân vật đang mặc' }, target_outfit: { colors: ['màu'], materials: ['chất liệu'], items: ['danh sách món'], description: 'mô tả tổng quát đồ mới' } }." }
      ]
    },
    config: { responseMimeType: 'application/json' }
  });
  return JSON.parse(analysis.text || '{}');
};

export const generateStoryboard = async (
  style: VideoStyle, 
  characterImage: string, 
  outfitImage: string, 
  backgroundReference: string
): Promise<Scene[]> => {
  const metadata = await analyzeIdentity(characterImage, outfitImage);
  const character = metadata.character || { gender: 'nữ', hair: 'tóc tự nhiên', age: 'trẻ' };
  const outfit = metadata.target_outfit || { colors: [], materials: [], items: [] };

  const systemPrompt = `Bạn là chuyên gia kịch bản video UGC thương mại của MKT AFFILIATE. Hãy tạo kịch bản 5 khung hình chuyên nghiệp (Pipeline V5 Final). 
    BẮT BUỘC: Tất cả nội dung prompt ảnh và video phải bằng TIẾNG VIỆT.
    
    NHÂN VẬT: ${character.gender === 'nữ' ? 'Cô gái' : 'Chàng trai'} (${character.hair}, ${character.age}).
    ĐỒ GỐC ĐANG MẶC: ${character.original_outfit}.
    TRANG PHỤC ĐÍNH KÈM (ĐỒ MỚI): ${outfit.description}.
    BỐI CẢNH: ${backgroundReference.startsWith('data:') ? 'Thống nhất theo ảnh bối cảnh người dùng cung cấp' : backgroundReference}.

    QUY TẮC MKT AFFILIATE V5 (CHI TIẾT):
    1. CẢNH 1 (Nhận hàng): Nhân vật mặc ĐỒ GỐC, đang nhận một thùng carton giấy kích thước mỏng 40x30x30 còn nguyên băng keo.
    2. CẢNH 2 (Mở hộp): Nhân vật mặc ĐỒ GỐC, hai cánh tay đang mở thùng carton giấy 40x30x30 (đã mở nắp), bên trong để lộ ra MỘT PHẦN trang phục đính kèm (màu ${outfit.colors.join(', ')}), trang phục đang được kéo nhẹ lên từ thùng, tại không gian đã chọn.
    3. CẢNH 3 (Góc nhìn phía sau): Nhân vật ĐANG MẶC trang phục đính kèm (ĐỒ MỚI). Góc nhìn từ PHÍA SAU LƯNG, để lộ vai, không nhìn rõ mặt. Tập trung vào phom dáng lưng, vai và chất liệu vải của đồ mới.
    4. CẢNH 4 (Diện đồ trung): Nhân vật mặc TRANG PHỤC ĐÍNH KÈM (đồ mới). Góc nhìn từ eo trở lên (Medium Shot), tay chỉnh sửa chi tiết áo hoặc tóc, thần thái tự tin.
    5. CẢNH 5 (Toàn thân): Avatar nhân vật chính mặc hoàn chỉnh TRANG PHỤC ĐÍNH KÈM (đồ mới). GÓC NHÌN TOÀN THÂN (Full Body), tạo dáng tự tin, bối cảnh đồng nhất.

    Trả về JSON Scene[]. Mỗi scene có image_prompt_text và video_prompt_text chi tiết bằng tiếng Việt.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: systemPrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            scene_id: { type: Type.INTEGER },
            scene_name: { type: Type.STRING },
            image_prompt_text: { type: Type.STRING },
            video_prompt_text: { type: Type.STRING }
          },
          required: ['scene_id', 'scene_name', 'image_prompt_text', 'video_prompt_text']
        }
      }
    }
  });

  const rawScenes = JSON.parse(response.text || '[]');
  
  return Promise.all(rawScenes.map((rs: any, index: number) => 
    generateSingleSceneImage(index, rs, characterImage, outfitImage, backgroundReference, character, outfit)
  ));
};

export const generateSingleSceneImage = async (
  index: number,
  sceneData: any,
  characterImage: string,
  outfitImage: string,
  backgroundReference: string,
  characterMetadata?: any,
  outfitMetadata?: any
): Promise<Scene> => {
  const parts: any[] = [
    { inlineData: { data: characterImage.split(',')[1], mimeType: 'image/png' } },
    { inlineData: { data: outfitImage.split(',')[1], mimeType: 'image/png' } },
  ];

  if (backgroundReference.startsWith('data:')) {
    parts.push({ inlineData: { data: backgroundReference.split(',')[1], mimeType: 'image/png' } });
  }

  let v5Constraint = "";
  switch(index) {
    case 0: 
      v5Constraint = "Nhân vật mặc ĐỒ GỐC. Đang cầm thùng carton 40x30x30 mới nguyên băng keo."; 
      break;
    case 1: 
      v5Constraint = "Nhân vật mặc ĐỒ GỐC. Ngồi xuống hoặc đỡ thùng carton 40x30x30 đã mở nắp. Bên trong lộ một phần ĐỒ MỚI xếp gọn, đúng màu sắc và chất liệu."; 
      break;
    case 2: 
      v5Constraint = "Góc nhìn PHÍA SAU LƯNG. Nhân vật ĐANG MẶC ĐỒ MỚI (trang phục đính kèm). Để lộ vai, không thấy rõ mặt. Thấy rõ chất liệu và phom dáng lưng của đồ mới."; 
      break;
    case 3: 
      v5Constraint = "Đã mặc ĐỒ MỚI (trang phục đính kèm). Góc máy Medium Shot từ eo lên. Giữ đúng gương mặt avatar gốc."; 
      break;
    case 4: 
      v5Constraint = "Đã mặc ĐỒ MỚI hoàn chỉnh. GÓC NHÌN TOÀN THÂN (FULL BODY). Tạo dáng tự tin trong không gian bối cảnh đồng nhất."; 
      break;
  }

  const finalImagePrompt = `Prompt chi tiết bằng tiếng Việt: ${sceneData.image_prompt_text || (sceneData.image_prompt ? sceneData.image_prompt.content : '')}. 
    Ràng buộc V5: ${v5Constraint}. Chất lượng 4K, siêu thực, không chữ, không phụ đề.`;

  parts.push({ text: finalImagePrompt });

  const imageRes = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: { imageConfig: { aspectRatio: "9:16" } }
  });

  let base64 = '';
  // Correctly iterate through parts to find image data as per guidelines
  const candidate = imageRes.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        base64 = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }
  }

  return {
    scene_id: sceneData.scene_id,
    scene_name: sceneData.scene_name,
    image_url: base64 || 'https://picsum.photos/400/700',
    image_prompt: {
      content: sceneData.image_prompt_text || (sceneData.image_prompt ? sceneData.image_prompt.content : ''),
      language: 'vi',
      constraints: ['không phụ đề', 'không văn bản hiển thị']
    },
    video_prompt: {
      content: sceneData.video_prompt_text || (sceneData.video_prompt ? sceneData.video_prompt.content : ''),
      language: 'vi',
      duration_seconds: 8,
      constraints: ['không phụ đề', 'không văn bản', 'không logo', 'không cover']
    }
  };
};
