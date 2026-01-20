
import { VideoStyle } from './types';

export const STYLE_CONFIGS = {
  [VideoStyle.UNBOX_SHOW]: {
    name: 'Unbox & Show Dáng',
    scenes: ['Nhận hàng', 'Khui gói', 'Kiểm tra', 'Mặc thử', 'Cận cảnh chi tiết']
  },
  [VideoStyle.PRODUCT_REVIEW]: {
    name: 'Review Sản Phẩm',
    scenes: ['Giới thiệu', 'Tính năng', 'Trải nghiệm', 'So sánh', 'Tổng kết']
  },
  [VideoStyle.FASHION_LOOKBOOK]: {
    name: 'Fashion Lookbook',
    scenes: ['Dáng đứng', 'Chuyển động', 'Phối đồ', 'Chất liệu', 'Pose cuối']
  }
};

export const ASPECT_RATIOS = ['9:16', '16:9'];
