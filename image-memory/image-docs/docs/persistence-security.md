# Keeping Memories Safe & Secure

Visual memories are precious. NIMS is built with **"Indestructible Safety"** and **"Privacy-First"** intelligence in mind. This section explains how we protect your data.

---

## 1. The Safety: The Digital Indestructible Safe (The Essence)

Imagine writing in a journal. If the power goes out while you are writing, you might lose the whole page. 
NIMS uses an **"Atomic Safe"** logic. It writes your new memories on a "temporary page" first. Only once the page is perfect does it swap it into your main journal. This means your visual history is **never corrupted**, even if the computer crashes.

---

## 2. The Privacy: The Neural Mask (The Logic)

We believe you should own your memories. NIMS includes a **Privacy Mode** that uses "Neural Blurring."

1.  **Friend vs. Stranger**: The system knows your friends. If it sees someone it doesn't recognize in the background of your photo, it identifies them as a "Stranger."
2.  **Automatic Protection**: In Privacy Mode, the system can "blur" the faces of these strangers automatically, keeping your family photos focused only on the people you know.

---

## 3. The Tech: Atomic Snapshots & Encryption (The Engineering)

Technically, we ensure data integrity and privacy through two main architectural patterns:

### A. Atomic Write-Then-Rename
NIMS never "updates" your data file. It "replaces" it atomically.
- **Step 1**: Write all memory data to `image-memory.json.tmp`.
- **Step 2**: The Operating System performs a `rename` to `image-memory.json`.
In computer science, this is an **Atomic Operation**. It either happens 100% or 0%—there is no 50% state where your data is broken.

### B. High-Availability Ingestion
To make the system fast and reliable, we use **Background Workers (BullMQ)**.
- When you upload 100 photos, the system doesn't make you wait. 
- It puts them in a "Processing Line." 
- If one photo fails because of a bad file, the system simply moves to the next one, ensuring your entire upload isn't blocked by one bad apple.

### C. Resource Optimization
NIMS tracks "Dirty States." It only saves to the disk if a change actually happened. This saves your hard drive from unnecessary wear and tear, ensuring your **Digital Brain** lasts for many years.

---

*Documentation Date: 2026-03-17*
