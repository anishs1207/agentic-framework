import { Tool, z } from "../core/tool.js";

const weatherSchema = z.object({
  city: z.string().min(1, "city must not be empty").describe("Name of the city"),
});

export const weatherTool = new Tool({
  name: "weather",
  description: "Get current weather for a city",
  inputDescription: 'JSON object with a "city" field (e.g. {"city": "Delhi"})',
  examples: ['{"city": "Delhi"}', '{"city": "London"}', '{"city": "New York"}'],
  inputSchema: weatherSchema,
  func: async ({ city }) => {
    const temps: Record<string, { temp: string; condition: string; humidity: string }> = {
      delhi: { temp: "35°C", condition: "☀️ Sunny", humidity: "45%" },
      mumbai: { temp: "30°C", condition: "🌤 Humid", humidity: "78%" },
      london: { temp: "15°C", condition: "☁️ Cloudy", humidity: "82%" },
      "new york": { temp: "22°C", condition: "🌤 Clear", humidity: "55%" },
      tokyo: { temp: "18°C", condition: "🌸 Pleasant", humidity: "60%" },
      paris: { temp: "17°C", condition: "🌧 Rainy", humidity: "75%" },
      bangalore: { temp: "28°C", condition: "⛅ Partly Cloudy", humidity: "65%" },
      sydney: { temp: "24°C", condition: "☀️ Sunny", humidity: "50%" },
    };
    const key = city.toLowerCase().trim();
    const data = temps[key];
    if (data) {
      return `Weather in ${city}: ${data.temp}, ${data.condition}, Humidity: ${data.humidity}`;
    }
    return `Weather in ${city}: 25°C, ⛅ Partly Cloudy, Humidity: 55%`;
  },
});
