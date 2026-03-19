# Frontend State Management

Handling dynamic image grids, streaming chat responses, and global themes in Next.js requires robust, predictable state management.

## 1. Global State: Zustand
For simple, cross-app state variables (like whether the Upload Modal is open, or the current selected UI Theme), NIMS relies on Zustand.
- **Why?** It's lighter than Redux and avoids the complex provider hell of pure React Context.

```typescript
const useUIStore = create((set) => ({
  isChatOpen: false,
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  activeAccentColor: '#3498db',
  setAccentColor: (color) => set({ activeAccentColor: color }),
}))
```

## 2. Server State: SWR / React Query
The Memory Vault needs to fetch paginated data from the NestJS backend. We use data fetching libraries (like SWR or React Query) to handle the complex edge cases:
- **Pagination:** Handling the "Load More" button or infinite scroll triggers.
- **Caching:** Switching from the "Gallery" to "Identity Explorer" and back should not trigger a re-fetch of images. They should instantly load from cache.
- **Optimistic UI:** When a user renames an Identity, the UI updates instantly while the backend request processes asynchronously.

## 3. The Chat Stream (RAG)
Managing the state of the Neural Assistant chat is uniquely complex because the backend responds with Server Sent Events (SSE) or streaming chunks. 
- The chat maintains a local array of `Message` objects.
- As chunks arrive from the VLM, the final `Message` object's `content` property is concatenated, triggering a React re-render, creating the "typing" effect on the frontend.

---

*Documentation Date: 2026-03-19*
