import { Tool } from "../core/tool.js";

export const getTimeTool = new Tool({
  name: "getTime",
  description: "Get the current date and time in IST",
  inputDescription: "No input required (pass empty string)",
  examples: [""],
  func: async (_input: string) => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Kolkata",
    };
    return `Current time: ${now.toLocaleString("en-IN", options)} IST`;
  },
});
