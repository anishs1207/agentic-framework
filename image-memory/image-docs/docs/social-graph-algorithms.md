# Social Graph Algorithms

The NIMS identity system is not just a facial recognition tool; it's a social context engine. It builds a graph of your relationships based on visual coexistence.

## 1. Identity Resolution (Person Re-ID)
When the pipeline finds a bounding box with a person, it extracts a crop. The system then faces a decision:
- **Scenario A:** Is this a new person?
- **Scenario B:** Is this a known identity (e.g., Mom)?

To resolve this, NIMS uses a combination of Face Embeddings and Clothing Consistency. If the person has the same embedding footprint as Identity A, they are linked.

## 2. Co-Appearance Modeling
If Person A and Person B are found in the same memory, NIMS establishes a `RelationshipEdge` between them in the database graph.

### Building Confidence
One photo of two people doesn't prove a strong relationship. The algorithm utilizes an inverted exponential confidence curve:
- Image 1: Confidence 0.3 (Acquaintances?)
- Image 5: Confidence 0.7 (Friends?)
- Image 20+: Confidence 0.99 (Family/Partner)

## 3. The Front-end Force Directed Graph
In the Identity Explorer (Next.js), this data is rendered as an interactive D3 or React-based force-directed graph.
- **Node Size:** Correlates with the total number of appearances of an identity.
- **Node Distance (Edge Length):** Inverse to the relationship confidence score. Highly related people pull closer together visually.

## Resolving Aliases
A key feature of NIMS is the ability to merge identities. Over time, the system might realize that "Man in blue shirt" and "John Doe" are the same person. The system can safely merge their embeddings, combining their historical appearances into one unified node.

---

*Documentation Date: 2026-03-19*
