export type BounceMotion =
  | 'spring-sway'      // 弹簧摇摆 (底部固定不动，上面左右弹动摇摆，幅度随时间衰减)
  | 'jelly-duang'      // 经典果冻Duang回弹 (底部固脚垂直挤压拉伸)
  | 'belly-breathe'    // 腮帮/肚子膨胀鼓动 (双向节奏鼓气收缩)
  | 'jelly-jiggle'     // 高频布丁果冻微颤 (如碰触布丁般的密集体态震颤)
  | 'trampoline-hop'   // 软糖蹦床超弹跳 (深度压缩蓄力 -> 冲刺拉伸 -> 滞空微颤 -> Duang落地)
  | 'floating-bubble'  // 漂浮果冻软萌漫游 (零重力失重慢摇与呼吸)
  | 'dough-knead'      // 糯米团挤压揉捏 (对角线挤压形变与回弹)
  | 'heartbeat-pulse'; // 心跳砰砰律动 (双连发律动)

export type GifBgType = 'transparent' | 'white' | 'checker' | 'pink' | 'dark';

export type EasingType = 'linear' | 'sine' | 'back' | 'bounce';

export type AccessoryType = 'none' | 'sweat' | 'heart' | 'stars' | 'music' | 'custom';

export type ExportFormat = 'gif' | 'wechat-gif' | 'webp' | 'spritesheet' | 'zip-frames';

export type BounceDirection =
  | 'vertical'        // 垂直上下 (0°)
  | 'horizontal'      // 水平左右 (90°)
  | 'diagonal-right'  // 东北-西南斜向 (45°)
  | 'diagonal-left'   // 西北-东南斜向 (-45° / 135°)
  | 'custom';         // 任意自定义角度 (0° ~ 360°)

export interface CustomAccessoryItem {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
}

export interface AccessoryConfig {
  type: AccessoryType;
  size: number;          // 0.6 to 1.6
  lagIntensity: number;  // 0 to 1 (次级惯性延迟强度)
  offsetX: number;       // 水平位置偏移 (全画布任意位置)
  offsetY: number;       // 垂直位置偏移 (全画布任意位置)
  rotation: number;      // 挂件自转角度 (-180° ~ 180°)
  customImageUrl?: string; // 自定义上传并自动抠图的挂件图片
  customName?: string;
}

export interface BouncePart {
  id: string;
  name: string;            // 贴图/部位名称，如 "猫耳"、"大汗滴"、"呆毛"
  type?: 'cutout' | 'custom-upload' | 'preset-sticker'; // 贴图类型
  imageDataUrl: string;    // 局部透明 PNG Base64
  
  // 原始人物画布中的裁剪区域或贴图尺寸
  sourceX: number;
  sourceY: number;
  sourceW: number;
  sourceH: number;

  // 1对1专属扎根锚点（仅作为该贴图的一个旋转与摆动支点属性，绝不单独识别为部位）
  // 0.0 ~ 1.0 相对人物原图宽高的绝对坐标
  anchorX: number;
  anchorY: number;

  // 线段锚点底边模式 (防止耳朵/呆毛与头部脱节)
  anchorMode?: 'point' | 'line';
  anchorX2?: number;       // 线段第二个端点 X 坐标 (0.0 ~ 1.0)
  anchorY2?: number;       // 线段第二个端点 Y 坐标 (0.0 ~ 1.0)

  // 拖动挪位置偏移量（单位：像素）
  offsetX: number;
  offsetY: number;

  // 自由旋转角度（围绕自身锚点旋转，单位：度，-180° ~ 180°）
  rotation: number;

  // 镜像翻转与缩放 (支持左右对称耳朵、翅膀一键制作)
  flipH?: boolean;         // 水平翻转，默认 false
  flipV?: boolean;         // 垂直翻转，默认 false
  scale?: number;          // 独立大小缩放倍率 (0.2 ~ 3.0，默认 1.0)

  // 独立回弹形态与动力学配置
  motion?: 'spring' | 'orbit-spin' | 'jiggle' | 'sway' | 'breathe';
  bounceDirectionAngle?: number; // 独立弹力方向角度 (0° ~ 360°，任意自调摇摆与回弹倾斜方向)
  amplitudeMult?: number;  // 独立幅度倍率，默认 1.0
  speedMult?: number;      // 独立频率倍率，默认 1.0
  easing?: number;         // 独立物理重力缓动阻尼手感 (0 ~ 100)
  phaseDelay?: number;     // 独立相位延迟

  // 是否挖空原身体对应区域（原图抠出默认为 true，上传贴纸/复制副本为 false）
  hollowOutBody?: boolean;
  autoInfill?: boolean;    // 智能自动修补底色 (用周围发丝/肤色补全被挖空部位，防挪动或旋转时漏出背景)
  visible?: boolean;       // 是否可见，默认 true
}

export interface BounceAnchorPoint {
  id: string;
  name: string;        // 部位固定点名称，如 "固定点 1"、"呆毛根部"
  anchorX: number;     // 0.0 ~ 1.0 相对人物宽度的固定点X坐标
  anchorY: number;     // 0.0 ~ 1.0 相对人物高度的固定点Y坐标
  motion?: 'spring' | 'orbit-spin' | 'jiggle' | 'sway' | 'breathe';
}

export interface LocalBounceConfig {
  enabled: boolean;
  amplitude: number;       // 0.1 to 1.5 (局部额外回弹幅度)
  speedMult: number;       // 1.0 to 3.0 (局部震荡频率)
  phaseDelay: number;      // 0.0 to 0.4 (相对于身体的滞后相位)
  motion: 'spring' | 'orbit-spin' | 'jiggle' | 'sway' | 'breathe';
  onlyPartBounces: boolean;// 仅局部回弹，主体保持静止不弹跳
  direction?: 'follow' | 'vertical' | 'horizontal' | 'diagonal-right' | 'diagonal-left';
  // 独立回弹部位列表（每个部位 1:1 独立固定点、支持抠图复制、旋转与拖动挪位置）
  parts: BouncePart[];
  activePartId?: string;   // 当前激活选中的部位 ID
  // 用户自选设置的固定点列表（程序打开时默认不带任何固定点，数量以用户自己设置回弹部位数量为准）
  anchors: BounceAnchorPoint[];
  activeAnchorId?: string; // 当前正在调节的固定点 ID
  anchorX?: number;        // 兼容单点
  anchorY?: number;        // 兼容单点
}

export interface BounceTransform {
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
  rotation: number; // radians
  skewX: number;
  skewY: number;
  anchorX: number; // 0 to 1
  anchorY: number; // 0 to 1
  isBending?: boolean;
  topDisplacement?: number;
  topCompressY?: number;
}

export interface BounceConfig {
  motion: BounceMotion;
  amplitude: number;    // 0.05 to 1.00 (Squash amplitude up to 100%)
  speed: number;        // 0.5 to 5.0 (BPM / cycle speed up to 5x)
  easing: number;       // 0 to 100 (0: 匀速 -> 35: 正弦 -> 70: 回弹 -> 100: 弹跳)
  fps: number;          // 15, 24, 30, 50, 60 (最高支持 60 帧)
  frameCount: number;   // 20 to 60 frames per loop
  bgType: GifBgType;
  outputSize: number;   // 240 (WeChat), 280, 480, 640, 800
  antiAliasing: boolean;// 抗锯齿平滑开关 (边缘抗锯齿与超级采样)
  alphaDithering: boolean; // 透明通道扩散抗锯齿

  // 用户自选回弹方向
  bounceDirection: BounceDirection; // 垂直/水平/斜向/自定义角度
  bounceAngle: number;              // 0 ~ 360 度

  // 漫画特效挂件与物理增强
  accessory: AccessoryConfig;
  volumeConservation?: boolean; // 真实物理体积守恒膨胀联动 (挤压时两侧自然鼓胀，拉伸时收缩)
  jellyBulge?: boolean;          // 非线性果冻弧形弧线鼓胀 (让下蹲挤压时腰线呈现真实饱满的抛物线弧度)
  jellyGloss?: boolean;          // 水润果冻弧形高光反光层 (日系高光闪耀质感)
  groundShadow: boolean; // 动态受光地面阴影
  impactRipple: boolean; // 落地触地软糖冲击波
  wechatOptimized: boolean; // 微信表情包规范适配模式 (<1MB, 240px)

  // 局部多部位独立回弹 (通过笔刷划定区域)
  localBounce: LocalBounceConfig;
}

export interface CutoutSettings {
  tolerance: number; // 5 to 60
  feather: number;   // 0 to 3
  autoTrim: boolean;
  antiAliased: boolean;
}
