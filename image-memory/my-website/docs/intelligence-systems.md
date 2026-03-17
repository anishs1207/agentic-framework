# Talking to Your Memories

NIMS transforms your photo collection into a conversational partner. This section explains how the **Neural Assistant** and **Identity Vault** work together to answer your questions.

---

## 1. The Experience: A Conversation with the Past (The Essence)

Think of the **Neural Assistant** like an old friend who has looked through every single one of your photo albums and remembered everything.

Instead of typing "Mom beach," you can ask: 
> "Can you find that photo where my Mom looked really happy at the beach last year? What was she wearing?"

The Assistant doesn't just show you the photo; it **describes the memory** back to you.

---

## 2. The Inner Workings: How it "Remembers" (The Logic)

To answer your questions, the system does three things very quickly:

1.  **Identity Recall**: It checks the "Person Vault" to see who you are talking about. It knows your "Mom" is the person identified across 50 other photos.
2.  **Scene Retrieval**: It looks for images that match your description (beach, happy mood, last year).
3.  **Context Building**: It gathers all the "metadata" (tags, text, descriptions) from those images and creates a **story** for the AI to read.

---

## 3. The Tech: RAG & Dialogue Memory (The Engineering)

Technically, the "Chat" is a sophisticated **Retrieval-Augmented Generation (RAG)** system.

### A. The "Memory Briefing" (Context Injection)
When you ask a question, NIMS generates a massive text block called a **Memory Context**. It looks like this to the AI:
> "System Note: User has 500 images. Person ID 'X' (Mom) appears in 12. In Image 45, she is at Malibu beach, wearing an orange hat, laughing with her sister."

### B. Dialogue History (The "Memory" of the Chat)
The Assistant isn't forgetful. It uses a **History Buffer**. 
- If you ask: "Where was this taken?" 
- And then ask: "Who else was there?" 
The system knows "there" refers to the location from your first question.

### C. Personal Biographies
Every person in your vault has a **dynamically generated biography**. NIMS looks at every photo of a person and writes a summary:
> "This person is usually seen at family gatherings. They often wear glasses and are frequently photographed with 'Dad'."

---

*Documentation Date: 2026-03-17*
