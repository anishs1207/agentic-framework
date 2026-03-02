import { Tool, z } from "../core/tool.js";

// ─── Unit Converter Tool ──────────────────────────────────────────────────────
// Supports: length, weight, temperature conversions

const UNIT_CATEGORIES = {
  length: {
    units: ["mm", "cm", "m", "km", "inch", "foot", "yard", "mile"],
    // All relative to meters
    toMeter: {
      mm: 0.001,
      cm: 0.01,
      m: 1,
      km: 1000,
      inch: 0.0254,
      foot: 0.3048,
      yard: 0.9144,
      mile: 1609.344,
    } as Record<string, number>,
  },
  weight: {
    units: ["mg", "g", "kg", "tonne", "ounce", "pound", "stone"],
    // All relative to grams
    toGram: {
      mg: 0.001,
      g: 1,
      kg: 1000,
      tonne: 1_000_000,
      ounce: 28.3495,
      pound: 453.592,
      stone: 6350.29,
    } as Record<string, number>,
  },
  temperature: {
    units: ["celsius", "fahrenheit", "kelvin"],
  },
} as const;

type LengthUnit = keyof typeof UNIT_CATEGORIES.length.toMeter;
type WeightUnit = keyof typeof UNIT_CATEGORIES.weight.toGram;
type TempUnit = "celsius" | "fahrenheit" | "kelvin";

function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  const meters = value * UNIT_CATEGORIES.length.toMeter[from];
  return meters / UNIT_CATEGORIES.length.toMeter[to];
}

function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  const grams = value * UNIT_CATEGORIES.weight.toGram[from];
  return grams / UNIT_CATEGORIES.weight.toGram[to];
}

function convertTemp(value: number, from: TempUnit, to: TempUnit): number {
  // Convert from → Celsius first
  let celsius: number;
  switch (from) {
    case "celsius":
      celsius = value;
      break;
    case "fahrenheit":
      celsius = (value - 32) * (5 / 9);
      break;
    case "kelvin":
      celsius = value - 273.15;
      break;
  }
  // Celsius → target
  switch (to) {
    case "celsius":
      return celsius;
    case "fahrenheit":
      return celsius * (9 / 5) + 32;
    case "kelvin":
      return celsius + 273.15;
  }
}

const unitConverterSchema = z.object({
  value: z.number().describe("The numeric value to convert"),
  from: z.string().min(1).describe("The source unit (e.g. km, pound, celsius)"),
  to: z.string().min(1).describe("The target unit (e.g. mile, kg, fahrenheit)"),
});

export const unitConverterTool = new Tool({
  name: "unitConverter",
  description:
    "Convert between units of length (mm/cm/m/km/inch/foot/yard/mile), weight (mg/g/kg/tonne/ounce/pound/stone), or temperature (celsius/fahrenheit/kelvin)",
  inputDescription: 'JSON object with "value", "from", and "to" fields',
  examples: [
    '{"value": 100, "from": "km", "to": "mile"}',
    '{"value": 70, "from": "kg", "to": "pound"}',
    '{"value": 100, "from": "celsius", "to": "fahrenheit"}',
  ],
  inputSchema: unitConverterSchema,
  func: async ({ value, from, to }) => {
    const fromL = from.toLowerCase().trim();
    const toL = to.toLowerCase().trim();

    if (fromL === toL) {
      return `${value} ${from} = ${value} ${to} (same unit)`;
    }

    // Detect category
    const lengthUnits = Object.keys(UNIT_CATEGORIES.length.toMeter);
    const weightUnits = Object.keys(UNIT_CATEGORIES.weight.toGram);
    const tempUnits = UNIT_CATEGORIES.temperature.units as readonly string[];

    if (lengthUnits.includes(fromL) && lengthUnits.includes(toL)) {
      const result = convertLength(value, fromL as LengthUnit, toL as LengthUnit);
      return `${value} ${from} = ${result.toFixed(6).replace(/\.?0+$/, "")} ${to}`;
    }

    if (weightUnits.includes(fromL) && weightUnits.includes(toL)) {
      const result = convertWeight(value, fromL as WeightUnit, toL as WeightUnit);
      return `${value} ${from} = ${result.toFixed(6).replace(/\.?0+$/, "")} ${to}`;
    }

    if (tempUnits.includes(fromL) && tempUnits.includes(toL)) {
      const result = convertTemp(value, fromL as TempUnit, toL as TempUnit);
      return `${value} ${from} = ${result.toFixed(2)} ${to}`;
    }

    // Cross-category or unknown
    if (!lengthUnits.includes(fromL) && !weightUnits.includes(fromL) && !tempUnits.includes(fromL)) {
      return `Unknown unit: "${from}". Supported: ${[...lengthUnits, ...weightUnits, ...tempUnits].join(", ")}`;
    }
    if (!lengthUnits.includes(toL) && !weightUnits.includes(toL) && !tempUnits.includes(toL)) {
      return `Unknown unit: "${to}". Supported: ${[...lengthUnits, ...weightUnits, ...tempUnits].join(", ")}`;
    }
    return `Cannot convert between "${from}" and "${to}" — they belong to different measurement categories.`;
  },
});
