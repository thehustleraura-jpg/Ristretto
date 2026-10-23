// Model, studio, tool and plan catalog. Edit freely; the frontend reads it from /api/catalog.
// `fal` values are best-effort endpoint ids for the fal.ai adapter — verify each against fal's model list before going live.

export const BRAND = "Ristretto";

export const MODELS = [
  // ---- video ----
  { id: "veo-3-1", name: "Veo 3.1", vendor: "Google", kind: "video", tag: "Cinematic video", blurb: "Film-grade motion, color and native audio.", res: "4K", audio: true, cost: 22, fal: "fal-ai/veo3.1", badge: "NEW" },
  { id: "kling-3", name: "Kling 3.0", vendor: "Kuaishou", kind: "video", tag: "4K video, one step", blurb: "Native 4K cinematic video in a single pass.", res: "4K", cost: 20, fal: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video" },
  { id: "sora-2-pro", name: "Sora 2 Pro", vendor: "OpenAI", kind: "video", tag: "Narrative & multi-shot", blurb: "Multi-shot storyboards, physics that hold across the cut.", res: "1080p", audio: true, cost: 28, fal: "fal-ai/sora-2/text-to-video/pro", badge: "NEW" },
  { id: "seedance-2", name: "Seedance 2.0", vendor: "ByteDance", kind: "video", tag: "Native audio, multi-shot", blurb: "Multi-shot sequences with synchronized audio.", res: "1080p", audio: true, cost: 18, fal: "fal-ai/bytedance/seedance/v1/pro/text-to-video" },
  { id: "hailuo-2-3", name: "Hailuo 2.3 Pro", vendor: "MiniMax", kind: "video", tag: "1080p video", blurb: "Expressive motion at 1080p.", res: "1080p", cost: 14, fal: "fal-ai/minimax/hailuo-02/pro/text-to-video" },
  { id: "luma-ray-2", name: "Luma Ray 2", vendor: "Luma", kind: "video", tag: "Photoreal video", blurb: "Photoreal motion and camera control.", res: "1080p", cost: 16, fal: "fal-ai/luma-dream-machine/ray-2" },
  { id: "wan-2-7", name: "Wan 2.7", vendor: "Alibaba", kind: "video", tag: "Open-weights video", blurb: "Fast, affordable open model.", res: "720p", cost: 8, fal: "fal-ai/wan/v2.2-a14b/text-to-video" },
  { id: "pixverse", name: "PixVerse", vendor: "PixVerse", kind: "video", tag: "Stylised video", blurb: "Effects and stylised motion.", res: "1080p", cost: 10, fal: "fal-ai/pixverse/v5/text-to-video" },
  // ---- image ----
  { id: "nano-banana-pro", name: "Nano Banana Pro", vendor: "Google", kind: "image", tag: "Realism + text", blurb: "Flawless typography and photoreal detail for hero stills.", res: "4K", cost: 6, fal: "fal-ai/nano-banana-pro" },
  { id: "flux-2-max", name: "FLUX.2 [max]", vendor: "Black Forest Labs", kind: "image", tag: "Max-fidelity stills", blurb: "State-of-the-art realism and multi-reference composition.", res: "4K", cost: 7, fal: "fal-ai/flux-pro/v1.1-ultra" },
  { id: "seedream-4-5", name: "Seedream v4.5", vendor: "ByteDance", kind: "image", tag: "Fast creative edits", blurb: "Unified generate-and-edit, artistic range, 4K output.", res: "4K", cost: 4, fal: "fal-ai/bytedance/seedream/v4/text-to-image" },
  { id: "gpt-image-2", name: "GPT Image 2", vendor: "OpenAI", kind: "image", tag: "Fine type", blurb: "Accurate text rendering up to 3840px.", res: "4K", cost: 8, fal: "fal-ai/gpt-image-1/text-to-image" },
  { id: "imagen-4-ultra", name: "Imagen 4 Ultra", vendor: "Google", kind: "image", tag: "Ultra-detail stills", blurb: "Ultra-detailed stills.", res: "2K", cost: 6, fal: "fal-ai/imagen4/preview/ultra" },
  { id: "ideogram-3", name: "Ideogram V3", vendor: "Ideogram", kind: "image", tag: "Typography", blurb: "Best-in-class typography and graphic design.", res: "2K", cost: 5, fal: "fal-ai/ideogram/v3" },
  { id: "recraft-v4", name: "Recraft V4.1 Pro", vendor: "Recraft", kind: "image", tag: "Print-ready", blurb: "Vector-ish, print-ready to 2048px.", res: "2K", cost: 5, fal: "fal-ai/recraft/v3/text-to-image" },
  { id: "flux-kontext", name: "FLUX.1 Kontext", vendor: "Black Forest Labs", kind: "image", tag: "In-context edits", blurb: "Edit an image with plain-language instructions.", res: "2K", cost: 5, fal: "fal-ai/flux-pro/kontext" },
  { id: "qwen-image", name: "Qwen-Image", vendor: "Alibaba", kind: "image", tag: "Open-weights stills", blurb: "Strong text rendering, low cost.", res: "2K", cost: 2, fal: "fal-ai/qwen-image" },
];

export const TOOLS = [
  { id: "lipsync", name: "Lipsync", blurb: "Any voice, any face.", needs: ["video", "audio"], cost: 14, fal: "fal-ai/sync-lipsync/v2" },
  { id: "upscale", name: "Upscale", blurb: "Stills & video, to 8K.", needs: ["image"], cost: 3, fal: "fal-ai/topaz/upscale/image" },
  { id: "inpaint", name: "Inpaint", blurb: "Erase, replace, restore.", needs: ["image", "prompt"], cost: 4, fal: "fal-ai/flux-pro/v1/fill" },
  { id: "remove-bg", name: "Remove BG", blurb: "Pixel-perfect cutouts.", needs: ["image"], cost: 1, fal: "fal-ai/birefnet/v2" },
  { id: "face-swap", name: "Face Swap", blurb: "Identity-preserving.", needs: ["image", "image2"], cost: 4, fal: "fal-ai/face-swap" },
  { id: "true-touch", name: "True Touch", blurb: "Photoreal skin & detail.", needs: ["image"], cost: 4, fal: "fal-ai/clarity-upscaler" },
  { id: "clothes-swap", name: "Clothes Swap", blurb: "Swap any garment.", needs: ["image", "image2"], cost: 5, fal: "fal-ai/fashn/tryon/v1.5" },
  { id: "style-transfer", name: "Style Transfer", blurb: "Match any reference look.", needs: ["image", "image2"], cost: 4, fal: "fal-ai/flux-pro/kontext" },
  { id: "extend", name: "Extend", blurb: "Outpaint beyond the frame.", needs: ["image", "prompt"], cost: 4, fal: "fal-ai/flux-pro/v1/fill" },
  { id: "restore", name: "Restore", blurb: "Fix and colorize old photos.", needs: ["image"], cost: 3, fal: "fal-ai/flux-pro/kontext" },
];

export const STUDIOS = [
  {
    id: "fashion", name: "Fashion", blurb: "On-model shoots, lookbooks and runway video — styled and ready.",
    model: "nano-banana-pro", ratio: "3:4", accent: "#d9a066",
    fields: [
      { key: "garment", label: "Garment", placeholder: "oversized wool coat, camel" },
      { key: "setting", label: "Setting", placeholder: "rainy Paris street at dusk" },
      { key: "mood", label: "Mood", placeholder: "editorial, moody, 35mm" },
    ],
    template: "Editorial fashion photograph. Model wearing {garment}. Location: {setting}. Mood: {mood}. Sharp fabric detail, natural skin, shot on 85mm.",
  },
  {
    id: "product", name: "Product", blurb: "Hero shots, lifestyle scenes and 360° turntables for every angle.",
    model: "flux-2-max", ratio: "1:1", accent: "#8fb8de",
    fields: [
      { key: "product", label: "Product", placeholder: "frosted glass perfume bottle" },
      { key: "surface", label: "Surface / scene", placeholder: "wet black slate, soft rim light" },
      { key: "style", label: "Style", placeholder: "minimal luxury ad" },
    ],
    template: "Commercial product photograph of {product} on {surface}. Style: {style}. Studio lighting, crisp reflections, high detail, clean composition.",
  },
  {
    id: "influencer", name: "AI Influencer", blurb: "One persona, consistent across every post and format.",
    model: "seedream-4-5", ratio: "4:5", accent: "#e59ab6",
    fields: [
      { key: "scene", label: "Scene", placeholder: "morning coffee on a balcony" },
      { key: "outfit", label: "Outfit", placeholder: "linen shirt, gold hoops" },
      { key: "light", label: "Light", placeholder: "golden hour" },
    ],
    template: "Lifestyle portrait for social media. Scene: {scene}. Outfit: {outfit}. Lighting: {light}. Candid, natural, true to the reference face.",
  },
  {
    id: "beauty", name: "Beauty & Cosmetics", blurb: "Macro skin, makeup and product shots with true-to-life texture.",
    model: "flux-2-max", ratio: "4:5", accent: "#f0b6a0",
    fields: [
      { key: "look", label: "Look / product", placeholder: "satin red lip, glossy finish" },
      { key: "close", label: "Framing", placeholder: "macro, lips and cheek" },
      { key: "light", label: "Light", placeholder: "soft beauty dish" },
    ],
    template: "Beauty photograph. {look}. Framing: {close}. Lighting: {light}. Visible skin texture, no over-smoothing, true colors.",
  },
  {
    id: "ugc", name: "UGC & Ads", blurb: "Creator-style UGC and ad formats, sized and ready to ship.",
    model: "seedream-4-5", ratio: "9:16", accent: "#a6e0b0",
    fields: [
      { key: "product", label: "Product", placeholder: "sparkling electrolyte drink" },
      { key: "action", label: "Creator action", placeholder: "cracks open can, smiles to camera" },
      { key: "place", label: "Place", placeholder: "bright kitchen, phone-camera look" },
    ],
    template: "Handheld, creator-style UGC ad frame. Product: {product}. Action: {action}. Place: {place}. Authentic phone-camera look, slight grain, natural light.",
  },
  {
    id: "headshots", name: "Headshots & Personal Branding", blurb: "Studio-grade headshots and on-brand portraits, on demand.",
    model: "nano-banana-pro", ratio: "4:5", accent: "#c8c8d0",
    fields: [
      { key: "attire", label: "Attire", placeholder: "navy blazer, white shirt" },
      { key: "backdrop", label: "Backdrop", placeholder: "soft grey seamless" },
      { key: "vibe", label: "Vibe", placeholder: "confident, approachable" },
    ],
    template: "Professional headshot. Attire: {attire}. Backdrop: {backdrop}. Vibe: {vibe}. Studio lighting, sharp eyes, retouched but natural.",
  },
  {
    id: "cinema", name: "Cinema / Micro-Drama", blurb: "Cinematic scenes and short-form micro-dramas — cast, lit, color-graded.",
    model: "veo-3-1", ratio: "16:9", accent: "#e8805f",
    fields: [
      { key: "scene", label: "Scene", placeholder: "two strangers share an umbrella at a bus stop" },
      { key: "camera", label: "Camera", placeholder: "slow push-in, anamorphic" },
      { key: "grade", label: "Color grade", placeholder: "teal and amber, night rain" },
    ],
    template: "Cinematic shot. {scene}. Camera: {camera}. Color grade: {grade}. Film grain, shallow depth of field, motivated lighting.",
  },
  {
    id: "realestate", name: "Real Estate / Interiors", blurb: "Stage, relight and restyle any space — empty to listing-ready.",
    model: "flux-kontext", ratio: "3:2", accent: "#b9d6a6",
    fields: [
      { key: "room", label: "Room", placeholder: "living room, empty" },
      { key: "style", label: "Style", placeholder: "japandi, warm oak, linen" },
      { key: "light", label: "Light", placeholder: "bright midday daylight" },
    ],
    template: "Interior photograph of a {room}, staged in {style} style. Lighting: {light}. Wide angle, straight verticals, listing-ready.",
  },
];

export const REFERENCES = [
  { id: "ref-duo-booth", title: "Booth duet", tag: "TREND · 2 PEOPLE", seconds: 7, ratio: "16:9", seed: 11 },
  { id: "ref-dance-recast", title: "Dance recast", tag: "PERSON SWAP · 9:16", seconds: 9, ratio: "9:16", seed: 23 },
  { id: "ref-museum", title: "Museum escape", tag: "SCENE REMIX", seconds: 8, ratio: "16:9", seed: 31 },
  { id: "ref-street-dance", title: "Street dance", tag: "MOTION TRANSFER", seconds: 10, ratio: "9:16", seed: 47 },
  { id: "ref-rooftop", title: "Rooftop night", tag: "GROUP · 4 PEOPLE", seconds: 12, ratio: "16:9", seed: 59 },
  { id: "ref-snow", title: "Desert to snow", tag: "LOCATION RESTYLE", seconds: 8, ratio: "16:9", seed: 61 },
  { id: "ref-pastel", title: "Pastel fight", tag: "STYLE RESTYLE", seconds: 6, ratio: "16:9", seed: 73 },
  { id: "ref-helicopter", title: "Helicopter night", tag: "CINEMATIC RESTYLE", seconds: 7, ratio: "16:9", seed: 83 },
  { id: "ref-choir", title: "Choir storm", tag: "REFERENCE · AUDIO KEPT", seconds: 11, ratio: "16:9", seed: 97 },
];

