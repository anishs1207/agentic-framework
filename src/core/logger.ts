// ANSI Color Codes (no external deps)

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",

  // Foreground
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Backgrounds
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgRed: "\x1b[41m",
};

function c(color: string, text: string): string {
  return `${color}${text}${COLORS.reset}`;
}

// Logger 
export class Logger {
  verbose: boolean;

  constructor(verbose: boolean = true) {
    this.verbose = verbose;
  }

  header(text: string) {
    const line = "═".repeat(60);
    console.log(c(COLORS.cyan, line));
    console.log(c(COLORS.bold + COLORS.cyan, `  ${text}`));
    console.log(c(COLORS.cyan, line));
  }

  subHeader(text: string) {
    console.log(c(COLORS.dim + COLORS.cyan, `─── ${text} ${"─".repeat(Math.max(0, 54 - text.length))}`));
  }

  thought(iteration: number, text: string) {
    if (!this.verbose) return;
    console.log(c(COLORS.yellow, `\n💭 [Step ${iteration}] Thought:`));
    console.log(c(COLORS.dim, `   ${text.split("\n").join("\n   ")}`));
  }

  action(toolName: string, input: string) {
    console.log(c(COLORS.blue + COLORS.bold, `\n🔧 [Action] `), c(COLORS.blue, `${toolName}(${input})`));
  }

  observation(result: string) {
    console.log(c(COLORS.green, `👁  [Observation] `), c(COLORS.dim, result));
  }

  finalAnswer(answer: string) {
    console.log(c(COLORS.green + COLORS.bold, `\n✅ [Final Answer]`));
    console.log(c(COLORS.white, `   ${answer}`));
  }

  error(msg: string) {
    console.log(c(COLORS.red + COLORS.bold, `\n❌ [Error] `) + c(COLORS.red, msg));
  }

  warn(msg: string) {
    console.log(c(COLORS.yellow, `⚠️  ${msg}`));
  }

  info(msg: string) {
    console.log(c(COLORS.gray, `ℹ️  ${msg}`));
  }

  thinking() {
    if (!this.verbose) {
      process.stdout.write(c(COLORS.dim, "⏳ Thinking..."));
    }
  }

  toolList(tools: string[]) {
    console.log(c(COLORS.magenta + COLORS.bold, "\n📦 Available Tools:"));
    tools.forEach((t) => {
      console.log(c(COLORS.magenta, `   • ${t}`));
    });
    console.log();
  }

  memory(count: number) {
    if (!this.verbose) return;
    console.log(c(COLORS.dim, `🧠 Memory: ${count} message(s) in context`));
  }

  retry(attempt: number, maxRetries: number, error: string) {
    console.log(c(COLORS.yellow, `🔄 Retry ${attempt}/${maxRetries}: ${error}`));
  }

  separator() {
    console.log(c(COLORS.dim, "─".repeat(60)));
  }
}

export const logger = new Logger(true);
