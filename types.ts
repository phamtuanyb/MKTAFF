
export enum VideoStyle {
  UNBOX_SHOW = 'UNBOX_SHOW',
  PRODUCT_REVIEW = 'PRODUCT_REVIEW',
  FASHION_LOOKBOOK = 'FASHION_LOOKBOOK'
}

export interface PromptSet {
  content: string;
  language: 'vi';
  constraints: string[];
}

export interface Scene {
  scene_id: number;
  scene_name: string;
  image_url: string;
  image_prompt: PromptSet;
  video_prompt: PromptSet & { duration_seconds: number };
}

export interface GenerationRequest {
  id: string;
  style: VideoStyle;
  timestamp: number;
  scenes: Scene[];
  referenceImage?: string;
}
