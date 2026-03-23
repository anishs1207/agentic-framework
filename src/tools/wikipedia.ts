import { Tool, z } from "../core/tool.js";

const wikipediaSchema = z.object({
  query: z
    .string()
    .min(1, "query must not be empty")
    .describe("The topic or phrase to search on Wikipedia"),
});

export const wikipediaTool = new Tool({
  name: "wikipedia",
  description: "Search Wikipedia for information about a topic",
  inputDescription: 'JSON object with a "query" field (e.g. {"query": "Albert Einstein"})',
  examples: ['{"query": "Albert Einstein"}', '{"query": "JavaScript"}', '{"query": "Moon landing"}'],
  inputSchema: wikipediaSchema,
  func: async ({ query }) => {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
      const response = await fetch(url);

      if (!response.ok) {
        return `No Wikipedia article found for "${query}"`;
      }

      const data = (await response.json()) as Record<string, unknown>;
      const title = (data.title as string) || query;
      const extract = (data.extract as string) || "No summary available.";

      // Truncate to keep it manageable
      const summary = extract.length > 500 ? extract.slice(0, 500) + "..." : extract;
      return `Wikipedia: ${title}\n${summary}`;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return `Wikipedia search failed: ${errorMsg}`;
    }
  },
});
