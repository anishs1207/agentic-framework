# Recognizing People & Relationships

How does a computer know that the person in your childhood photo is the same person at your graduation? NIMS uses a "Consensus Engine" to figure this out.

---

## 1. The Concept: The Digital Detective (The Essence)

Imagine a detective looking at a stack of photos. 
- In one photo, they see a man in a red shirt. 
- In another, a man in a red shirt is holding a child. 
- In a third, that same man is called "Dad" in a card on the table.

NIMS acts like this detective. It looks for **clues** (clothes, faces, text, who else is in the photo) and puts the puzzle together over time.

---

## 2. The Process: How NIMS Recognizes You (The Logic)

The system doesn't just guess; it builds a "Case File" for every person.

1.  **The First Sighting**: NIMS sees a new person. It notes their hair, height, and clothes. It gives them a temporary ID (like "Stranger A").
2.  **The Second Sighting**: It sees someone similar. It asks: "Are they wearing the same watch? Are they standing next to the same people as before?"
3.  **The Consensus**: If the "clues" match enough times, NIMS merges the sightings. "Stranger A" becomes a permanent "Identity" in your vault.
4.  **Building the Social Graph**: By seeing who usually stands together, NIMS learns that Person A is likely the Husband of Person B. It doesn't need you to tell it; it **learns from the evidence.**

---

## 3. The Tech: Multi-Pass & Neural Matching (The Engineering)

To achieve this "detective" work, we use a specialized three-step technical pipeline:

### A. The "Wide Scan"
We send the whole image to our AI (**Gemini VLM**). It gives us a broad "Who and What" overview.

### B. The "High-Res Zoom" (Multi-Pass)
This is our secret sauce. NIMS **crops** every person into a new, smaller image and sends it back for a "Targeted Scan." This allows the AI to see things a human might miss—like the specific pattern on a tie or the frame of a pair of glasses.

### C. The Weighted Math (Consensus Algorithm)
We use math to decide on a match.
- **Visual Similarity (Faces/Clothes)**: 40% of the score.
- **Language Description (The "Vibe")**: 60% of the score.
- **Social Boost**: If they are standing with people they've been seen with before, we give the score a **+15% boost**. This "Social Context" makes recognition incredibly accurate.

---

*Documentation Date: 2026-03-17*
