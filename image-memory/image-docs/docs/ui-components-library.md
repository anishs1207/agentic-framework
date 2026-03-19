# UI Components Library

The Next.js frontend is built utilizing a strict component hierarchy. It prioritizes atomic design, fluid motion, and glassmorphism. Below are the core components used across the system.

## 1. `MemoryCard.tsx`
The primary atomic unit of the Memory Vault. 
- **Props:** `id, imageUrl, blurhash, caption`
- **Behavior:** It intercepts the Intersection Observer to lazy-load the high-fidelity `imageUrl`. Before load, the `blurhash` provides a dynamic, colorful placeholder. On hover, the glass-pane metadata slides up over the image.

## 2. `AvatarCrop.tsx`
Used in the Identity Explorer. 
- **Props:** `src, size, isMasked`
- **Design:** Displays profile crops in a perfect circle. It applies a subtle CSS drop shadow colored by sampling the dominant hex code of the image itself, giving a "glowing" effect to the user's face.

## 3. `ChatBubble.tsx`
The RAG interface.
- **Behavior:** Supports multi-modal content. If the assistant's reply contains image context, the `ChatBubble` dynamically mounts a micro-gallery beneath the text. 
- **Animation:** Uses Framer Motion for a spring-physics-based slide-up entrance.

## 4. `ThemeEngineContext.tsx`
Not a visual component, but a global provider. It listens for the current active image on screen, extracts a palette using `color-thief`, and injects custom CSS Custom Properties (`--primary-accent`, `--glass-bg`) into the `:root` to shift the UI dynamically.

## Utility Classes (Tailwind/CSS)
- `.glass-panel`: `backdrop-filter: blur(16px); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);`

---

*Documentation Date: 2026-03-19*
