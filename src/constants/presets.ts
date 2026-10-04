import { PresetCharacter, PresetPrompt } from '../types/veo';

/**
 * ============================================================================
 * 👇【您指定的自定义预设图片配置位置】
 * ============================================================================
 * 如果您希望在代码中直接指定固定预设图片，可以在下方引号内直接填入：
 * 1. 本地图片/贴纸的 Base64 编码 (形如: "data:image/jpeg;base64,/9j/4AAQSkZJRg...")
 * 2. 或者公网图片 URL (形如: "https://your-domain.com/character.png")
 * 3. 或者放到 public 目录下的本地路径 (形如: "/my-character.png")
 *
 * 【提示】：在页面界面的「预设角色」栏右侧，也提供了「➕ 添加我的预设」按钮，
 * 可以直接在网页里拖拽/粘贴/上传图片并永久保存到您的预设库中！
 */
export const USER_CUSTOM_IMAGE_DATA: string = '';
export const USER_CUSTOM_CHARACTER_NAME: string = '奶茶萌妹';

export const DEFAULT_USER_PROMPT =
  '一镜到底，3D卡通动画，明亮厨房/餐桌背景。开场镜头正面中近景对着一个圆滚滚、软萌可爱的角色，角色眨眼、嘴角上扬。随后镜头快速环绕/甩到角色身后，角色转身，画面豁然出现一座巨大的雪白米饭山，热气腾腾，米粒粒粒分明，像布丁一样微微晃动。角色双手从底部一把托起整座米饭山，动作带夸张的Q弹果冻感，挤压拉伸，米饭山“duang”地回弹，角色身体也跟着弹一下。接着角色嘴巴夸张张到巨大，像黑洞一样，一口把整座米饭山吞下，脸颊鼓成球，咀嚼时脸和身体像果冻一样Q弹抖动。最后吞咽，肚子圆圆鼓起，满足地打嗝，米饭山消失，角色像果冻一样弹两下。镜头轻微跟随，喜剧节奏，慢动作到加速，软萌Q弹物理，高帧率，光滑3D渲染，色彩鲜艳，无文字。';

// Helper to generate a crisp SVG data URI
function createSvgDataUri(svgContent: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
}

// Preset Character 1: User's Uploaded Character - Chibi Blue Whale Maid (爱希娜雨妲海 同款贴纸角色)
const blueWhaleMaidSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <!-- Background pure white matching user upload -->
    <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2563eb" />
      <stop offset="40%" stop-color="#1d4ed8" />
      <stop offset="75%" stop-color="#1e3a8a" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
    <linearGradient id="dressNavy" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <filter id="stickerOutline" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#94a3b8" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Plain clean background -->
  <rect width="500" height="500" fill="#ffffff" />

  <!-- Sticker White Border / Silhouette Base -->
  <g filter="url(#stickerOutline)">
    <!-- White thick sticker silhouette backing -->
    <path d="M 230 45 C 130 50 80 120 70 230 C 60 300 85 410 150 450 C 180 470 320 470 360 440 C 430 390 440 280 420 180 C 400 90 320 45 230 45 Z" fill="#ffffff" stroke="#f1f5f9" stroke-width="12" />
  </g>

  <!-- Comic Shock Mark (Left Yellow/Orange Spiky Star) -->
  <g transform="translate(48, 65)">
    <polygon points="40,0 52,28 85,22 62,45 80,72 50,62 38,95 24,65 0,72 15,45 0,20 28,26" fill="#f59e0b" stroke="#d97706" stroke-width="3" />
    <polygon points="40,8 48,28 72,25 54,43 68,62 46,55 36,78 26,56 10,60 20,42 8,24 28,28" fill="#fbbf24" />
  </g>
  <!-- Shake lines on left -->
  <path d="M 75 240 Q 65 255 75 270" stroke="#0f172a" stroke-width="3.5" fill="none" stroke-linecap="round" />
  <path d="M 85 245 Q 75 255 85 265" stroke="#0f172a" stroke-width="3" fill="none" stroke-linecap="round" />

  <!-- Sweat Drops (Right Cyan Droplets) -->
  <g transform="translate(385, 105)">
    <path d="M 15 0 C 15 0 0 20 0 30 C 0 38 7 45 15 45 C 23 45 30 38 30 30 C 30 20 15 0 15 0 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2.5" />
    <path d="M 32 35 C 32 35 22 48 22 55 C 22 60 26 65 32 65 C 38 65 42 60 42 55 C 42 48 32 35 32 35 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2" />
  </g>

  <!-- Whale Tail Fin (Bottom Right behind character) -->
  <g transform="translate(330, 310)">
    <path d="M 10 30 Q 35 15 55 50 Q 40 75 10 65 Q 45 85 30 110 Q 5 95 0 60 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2" />
    <path d="M 8 50 Q 25 45 35 60" stroke="#bae6fd" stroke-width="2" fill="none" />
  </g>

  <!-- Back Hair (Long voluminous blue twintails/curls) -->
  <path d="M 140 180 C 80 230 70 360 120 405 C 145 385 135 320 160 290" fill="url(#hairGrad)" stroke="#1e3a8a" stroke-width="3" />
  <path d="M 360 180 C 430 240 435 365 375 410 C 355 385 365 320 340 290" fill="url(#hairGrad)" stroke="#1e3a8a" stroke-width="3" />

  <!-- Blue Whale/Dolphin Fin Hair Wings on ears -->
  <!-- Left Fin Wing -->
  <g transform="translate(70, 165)">
    <path d="M 55 25 C 20 20 0 45 5 65 C 25 70 50 55 55 25 Z" fill="#60a5fa" stroke="#1d4ed8" stroke-width="2.5" />
    <path d="M 45 45 C 30 50 15 65 20 75 C 35 78 50 65 52 50 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
    <!-- Cyan ribbon bow -->
    <path d="M 48 18 L 32 8 L 38 28 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="1.5" />
    <path d="M 52 18 L 68 8 L 62 28 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="50" cy="18" r="4.5" fill="#f59e0b" />
  </g>

  <!-- Right Fin Wing -->
  <g transform="translate(330, 145)">
    <path d="M 15 25 C 50 20 70 45 65 65 C 45 70 20 55 15 25 Z" fill="#60a5fa" stroke="#1d4ed8" stroke-width="2.5" />
    <path d="M 25 45 C 40 50 55 65 50 75 C 35 78 20 65 18 50 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
    <!-- Cyan ribbon bow -->
    <path d="M 22 18 L 6 8 L 12 28 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="1.5" />
    <path d="M 26 18 L 42 8 L 36 28 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="24" cy="18" r="4.5" fill="#f59e0b" />
  </g>

  <!-- Maid Headdress (White Ruffled Bonnet) -->
  <path d="M 125 130 C 135 60 365 60 375 130 C 355 110 145 110 125 130 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="3" />
  <!-- Scalloped Lace Ruffles -->
  <circle cx="150" cy="98" r="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
  <circle cx="180" cy="80" r="11" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
  <circle cx="215" cy="70" r="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
  <circle cx="250" cy="66" r="13" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
  <circle cx="285" cy="70" r="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
  <circle cx="320" cy="80" r="11" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
  <circle cx="350" cy="98" r="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />

  <!-- Chibi Legs & Feet (Socks and Shoes) -->
  <g transform="translate(160, 410)">
    <!-- Left Sock & Shoe -->
    <path d="M 10 0 L 10 25 Q 25 35 40 25 L 40 0 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <!-- Frill ring -->
    <ellipse cx="25" cy="5" rx="16" ry="5" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />
    <!-- Navy Mary Jane shoe -->
    <path d="M 5 20 Q 5 45 28 45 Q 48 45 45 20 Z" fill="#1e293b" stroke="#0f172a" stroke-width="2" />
    <!-- Shoe strap and buckle -->
    <path d="M 12 28 Q 26 34 38 28" stroke="#38bdf8" stroke-width="3" fill="none" />
    <circle cx="25" cy="30" r="3" fill="#fbbf24" />
  </g>
  <g transform="translate(235, 420)">
    <!-- Right Sock & Shoe -->
    <path d="M 10 0 L 10 25 Q 25 35 40 25 L 40 0 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <ellipse cx="25" cy="5" rx="16" ry="5" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />
    <path d="M 5 20 Q 5 45 28 45 Q 48 45 45 20 Z" fill="#1e293b" stroke="#0f172a" stroke-width="2" />
    <path d="M 12 28 Q 26 34 38 28" stroke="#38bdf8" stroke-width="3" fill="none" />
    <circle cx="25" cy="30" r="3" fill="#fbbf24" />
  </g>

  <!-- Navy Maid Skirt with Gold Marine Filigree -->
  <path d="M 140 330 C 110 375 140 405 250 405 C 360 405 390 375 360 330 Z" fill="url(#dressNavy)" stroke="#0f172a" stroke-width="3" />
  <!-- Under-skirt White Lace Frills -->
  <path d="M 130 380 Q 250 435 370 380 Q 250 420 130 380 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
  <!-- Gold Seashell & Scrollwork embroidery along skirt border -->
  <g stroke="#f59e0b" stroke-width="2" fill="none" stroke-linecap="round">
    <path d="M 155 365 Q 185 375 215 365 Q 245 375 275 365 Q 305 375 335 365" />
    <circle cx="245" cy="378" r="5" fill="#fbbf24" stroke="#d97706" />
    <path d="M 238 375 Q 245 385 252 375" />
  </g>

  <!-- White Frilly Whale Apron -->
  <g>
    <!-- Apron bib and skirt -->
    <path d="M 180 270 Q 250 260 320 270 L 330 375 Q 250 395 170 375 Z" fill="#ffffff" stroke="#e2e8f0" stroke-width="2.5" />
    <!-- Apron Ruffle Border -->
    <path d="M 165 370 C 180 390 320 390 335 370" fill="none" stroke="#cbd5e1" stroke-width="3" stroke-dasharray="6,4" />
    <!-- Cute Blue Whale Printed on Apron -->
    <g transform="translate(210, 315) scale(0.9)">
      <!-- Whale Body -->
      <path d="M 5 25 C 5 5 45 -5 65 15 C 80 30 85 45 55 50 C 30 55 5 45 5 25 Z" fill="#0284c7" stroke="#0369a1" stroke-width="2" />
      <path d="M 70 20 Q 90 10 95 18 Q 85 28 92 38 Q 78 30 70 20 Z" fill="#0284c7" />
      <circle cx="25" cy="22" r="3.5" fill="#ffffff" />
      <circle cx="26" cy="23" r="2" fill="#0f172a" />
      <!-- Water Fountain Droplets -->
      <path d="M 40 4 Q 40 -8 36 -14 M 42 4 Q 48 -10 54 -6" stroke="#38bdf8" stroke-width="2.5" fill="none" stroke-linecap="round" />
      <circle cx="34" cy="-16" r="2" fill="#38bdf8" />
      <circle cx="56" cy="-8" r="2" fill="#38bdf8" />
      <circle cx="45" cy="-14" r="1.5" fill="#38bdf8" />
    </g>
  </g>

  <!-- Collar & Navy Bow Tie with Sapphire -->
  <g transform="translate(220, 260)">
    <path d="M 10 10 L -5 0 L 0 20 Z" fill="#1e3a8a" stroke="#0f172a" stroke-width="1.5" />
    <path d="M 50 10 L 65 0 L 60 20 Z" fill="#1e3a8a" stroke="#0f172a" stroke-width="1.5" />
    <circle cx="30" cy="10" r="7.5" fill="#2563eb" stroke="#fbbf24" stroke-width="2.5" />
  </g>

  <!-- Clenched Cute Chibi Hands / Fists held at chest -->
  <!-- Left Fist -->
  <g transform="translate(190, 255)">
    <ellipse cx="15" cy="20" rx="14" ry="16" fill="#ffedd5" stroke="#fbd5b5" stroke-width="2" />
    <!-- White Frilly Sleeve Cuff -->
    <ellipse cx="15" cy="30" rx="16" ry="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <circle cx="8" cy="16" r="4" fill="#fed7aa" />
  </g>
  <!-- Right Fist -->
  <g transform="translate(265, 255)">
    <ellipse cx="15" cy="20" rx="14" ry="16" fill="#ffedd5" stroke="#fbd5b5" stroke-width="2" />
    <ellipse cx="15" cy="30" rx="16" ry="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <circle cx="22" cy="16" r="4" fill="#fed7aa" />
  </g>

  <!-- Head / Face (Round Anime Chibi Face) -->
  <ellipse cx="250" cy="205" rx="95" ry="85" fill="#fff7ed" stroke="#fed7aa" stroke-width="2" />

  <!-- Cute Rosy Blushing Cheeks -->
  <g fill="#fb7185" opacity="0.65">
    <ellipse cx="185" cy="235" rx="18" ry="11" />
    <ellipse cx="315" cy="235" rx="18" ry="11" />
    <!-- Blush hatching lines -->
    <line x1="178" y1="230" x2="183" y2="240" stroke="#f43f5e" stroke-width="2" />
    <line x1="184" y1="230" x2="189" y2="240" stroke="#f43f5e" stroke-width="2" />
    <line x1="310" y1="230" x2="315" y2="240" stroke="#f43f5e" stroke-width="2" />
    <line x1="316" y1="230" x2="321" y2="240" stroke="#f43f5e" stroke-width="2" />
  </g>

  <!-- Big Sparkling Blue Eyes -->
  <g>
    <!-- Left Eye -->
    <ellipse cx="198" cy="210" rx="21" ry="28" fill="#1d4ed8" />
    <ellipse cx="198" cy="218" rx="18" ry="20" fill="#38bdf8" />
    <ellipse cx="198" cy="222" rx="12" ry="13" fill="#0f172a" />
    <!-- Highlights -->
    <circle cx="191" cy="198" r="8" fill="#ffffff" />
    <circle cx="206" cy="222" r="4" fill="#ffffff" />
    <!-- Eyelash -->
    <path d="M 172 195 Q 198 180 224 195" stroke="#0f172a" stroke-width="6.5" stroke-linecap="round" fill="none" />
    <path d="M 174 188 L 166 182" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" />

    <!-- Right Eye -->
    <ellipse cx="302" cy="210" rx="21" ry="28" fill="#1d4ed8" />
    <ellipse cx="302" cy="218" rx="18" ry="20" fill="#38bdf8" />
    <ellipse cx="302" cy="222" rx="12" ry="13" fill="#0f172a" />
    <!-- Highlights -->
    <circle cx="295" cy="198" r="8" fill="#ffffff" />
    <circle cx="310" cy="222" r="4" fill="#ffffff" />
    <!-- Eyelash -->
    <path d="M 276 195 Q 302 180 328 195" stroke="#0f172a" stroke-width="6.5" stroke-linecap="round" fill="none" />
    <path d="M 326 188 L 334 182" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" />
  </g>

  <!-- Shocked Flustered Mouth (Waaah Open Mouth) -->
  <path d="M 232 232 Q 250 226 268 232 Q 272 254 250 256 Q 228 254 232 232 Z" fill="#e11d48" stroke="#881337" stroke-width="2" />
  <!-- Tongue / inner mouth highlight -->
  <path d="M 240 244 Q 250 238 260 244 Q 250 255 240 244 Z" fill="#fda4af" />
  <!-- Little Sweat drop on cheek -->
  <path d="M 325 240 Q 320 250 325 255 Q 330 255 330 250 Z" fill="#38bdf8" opacity="0.9" />

  <!-- Front Hair Bangs (Detailed anime layered bangs) -->
  <path d="M 150 170 C 170 220 200 230 215 180 C 235 235 265 235 285 180 C 300 230 330 220 350 170 C 345 130 300 120 250 120 C 200 120 155 130 150 170 Z" fill="url(#hairGrad)" stroke="#1e3a8a" stroke-width="3" />
  <!-- Ahoge (Cute hair curl at top) -->
  <path d="M 245 120 C 240 85 220 70 210 50 C 235 60 255 85 255 120 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="2" />
</svg>`;

// Preset Character 2: Rice Dango Spirit
const riceDangoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <radialGradient id="dangoGlow" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="70%" stop-color="#fef08a" />
      <stop offset="100%" stop-color="#fde047" />
    </radialGradient>
    <filter id="dangoShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-opacity="0.16" flood-color="#854d0e" />
    </filter>
  </defs>
  <rect width="400" height="400" fill="#ffffff" />
  
  <!-- Chef Hat -->
  <g transform="translate(160, 65)">
    <path d="M 10 45 L 70 45 L 65 58 L 15 58 Z" fill="#ef4444" rx="3" />
    <path d="M 12 45 Q -5 20 20 10 Q 40 -5 60 10 Q 85 20 68 45 Z" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" />
  </g>

  <!-- Super Round Squishy Body -->
  <ellipse cx="200" cy="240" rx="115" ry="105" fill="url(#dangoGlow)" filter="url(#dangoShadow)" />
  
  <!-- Rosy cheeks -->
  <ellipse cx="130" cy="255" rx="16" ry="10" fill="#f43f5e" opacity="0.45" />
  <ellipse cx="270" cy="255" rx="16" ry="10" fill="#f43f5e" opacity="0.45" />

  <!-- Shiny Happy Eyes -->
  <circle cx="150" cy="230" r="10" fill="#1e293b" />
  <circle cx="147" cy="226" r="3.5" fill="#ffffff" />
  <circle cx="250" cy="230" r="10" fill="#1e293b" />
  <circle cx="247" cy="226" r="3.5" fill="#ffffff" />

  <!-- Big smile -->
  <path d="M 185 245 Q 200 265 215 245" stroke="#1e293b" stroke-width="5" stroke-linecap="round" fill="none" />

  <!-- Little Nori Sheet Bib -->
  <rect x="180" y="275" width="40" height="35" rx="6" fill="#1e293b" />
</svg>`;

// Preset Character 3: Caramel Pudding Kitten
const puddingCatSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <radialGradient id="catGlow" cx="45%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#fffbeb" />
      <stop offset="85%" stop-color="#fed7aa" />
      <stop offset="100%" stop-color="#f97316" />
    </radialGradient>
    <filter id="catShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-opacity="0.18" flood-color="#c2410c" />
    </filter>
  </defs>
  <rect width="400" height="400" fill="#ffffff" />
  
  <!-- Ears -->
  <polygon points="120,130 160,80 180,140" fill="#f97316" />
  <polygon points="135,125 160,95 170,135" fill="#fbcfe8" />
  <polygon points="280,130 240,80 220,140" fill="#f97316" />
  <polygon points="265,125 240,95 230,135" fill="#fbcfe8" />

  <!-- Round Cat Head -->
  <ellipse cx="200" cy="210" rx="100" ry="90" fill="url(#catGlow)" filter="url(#catShadow)" />

  <!-- Caramel Syrup Cap -->
  <path d="M 130 160 Q 200 130 270 160 Q 260 185 240 180 Q 220 195 200 180 Q 180 195 160 180 Q 140 185 130 160 Z" fill="#78350f" opacity="0.85" />
  <circle cx="200" cy="140" r="10" fill="#ef4444" />

  <!-- Cat Eyes -->
  <ellipse cx="160" cy="205" rx="11" ry="14" fill="#047857" />
  <circle cx="157" cy="200" r="4" fill="#ffffff" />
  <ellipse cx="240" cy="205" rx="11" ry="14" fill="#047857" />
  <circle cx="237" cy="200" r="4" fill="#ffffff" />

  <!-- Cat Mouth -->
  <path d="M 190 225 Q 195 232 200 225 Q 205 232 210 225" stroke="#78350f" stroke-width="4" stroke-linecap="round" fill="none" />
  <circle cx="135" cy="225" r="9" fill="#fda4af" opacity="0.6" />
  <circle cx="265" cy="225" r="9" fill="#fda4af" opacity="0.6" />
</svg>`;

export const PRESET_CHARACTERS: PresetCharacter[] = [];

export const PRESET_PROMPTS: PresetPrompt[] = [
  {
    id: 'rice-mountain-duang',
    title: '米饭山Duang狂吃 (原版剧本)',
    badge: '推荐 · 一镜到底',
    description: '托起米饭山、果冻回弹挤压、黑洞大口吞下、脸颊Q弹鼓起、肚子圆鼓打嗝',
    prompt: DEFAULT_USER_PROMPT,
    aspectRatio: '16:9',
  },
  {
    id: 'jelly-pudding-trampoline',
    title: '巨型焦糖布丁蹦床大跳跃',
    badge: '3D果冻物理',
    description: '角色从空中跃下踩在巨型布丁上，剧烈Duang弹性形变，整只角色随之飞天翻滚',
    prompt:
      '一镜到底，3D卡通动画，暖色阳光甜品台背景。开场角色可爱眨眼微笑着站在跳台上，随后纵身跃向巨大的焦糖布丁！布丁瞬间产生极度夸张的Q弹挤压形变，波纹一圈圈荡漾，紧接着猛烈Duang回弹将角色抛向高空，角色四肢慢动作伸展欢呼，高帧率光滑3D渲染，充满果冻流体动态美，色彩鲜明无文字。',
    aspectRatio: '9:16',
  },
  {
    id: 'ramen-whirlwind',
    title: '龙卷风超长拉面吸入狂欢',
    badge: '喜剧节奏',
    description: '特大碗金黄拉面，角色嘴巴化作旋风风暴，面条弹性拉伸吸入，腮帮子吹气球',
    prompt:
      '一镜到底，3D卡通动画，蒸汽腾腾的日式拉面馆餐桌。角色盯着冒热气的巨碗拉面兴奋地搓手。镜头快速前推特写，角色深吸一口气，嘴巴夸张张大，整碗Q弹劲道的拉面化作一道金黄色的旋转面条龙卷风被狂暴吸入！角色两腮像气球一样左右交替鼓动，最后吞咽瞬间全身duang地弹跳，打出一个满足的气泡饱嗝，喜剧节奏，高帧率丝滑。',
    aspectRatio: '16:9',
  },
  {
    id: 'bubblegum-balloon-bounce',
    title: '超级粉红泡泡糖果冻漂浮',
    badge: '慢速到加速',
    description: '吹出超大粉红泡泡糖，包裹住角色轻柔漂浮，随后噗地弹回软萌落地',
    prompt:
      '一镜到底，3D卡通动画，明亮温馨房间背景。圆滚滚软萌的角色嘴里嚼着泡泡糖，腮帮子剧烈Q弹抖动。随后用力吹出一个巨大的粉红色透明果冻泡泡，泡泡越吹越大将角色整个托起漂浮在空中！泡泡表面反射彩虹光晕并在空气中DuangDuang震颤，最后啵的一声回缩包裹在脸上，角色像果冻布丁一样掉在软垫上连弹三下，表情超级治愈。',
    aspectRatio: '9:16',
  },
];
