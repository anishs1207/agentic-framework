import { vi, describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import { fileSystemTool } from "../src/tools/fileSystem.js";

vi.mock("fs");

describe("FileSystem Tool", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should prevent path traversal", async () => {
        const input = JSON.stringify({ op: "read", filepath: "../../etc/passwd" });
        const result = await fileSystemTool.execute(input);
        expect(result).toContain("ERROR: Path traversal detected");
    });

    it("should write a file", async () => {
        const input = JSON.stringify({ op: "write", filepath: "test.txt", content: "hello" });
        vi.mocked(fs.existsSync).mockReturnValue(true);
        const result = await fileSystemTool.execute(input);
        expect(fs.writeFileSync).toHaveBeenCalled();
        expect(result).toContain("Written 5 bytes to test.txt");
    });

    it("should read a file and truncate if too long", async () => {
        const longContent = "a".repeat(5000);
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(longContent);
        
        const input = JSON.stringify({ op: "read", filepath: "long.txt" });
        const result = await fileSystemTool.execute(input);
        expect(result).toHaveLength(4000 + 15); // truncate + info
        expect(result).toContain("...(truncated)");
    });

    it("should list directory contents", async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([
            { name: "file1.txt", isDirectory: () => false },
            { name: "dir1", isDirectory: () => true }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ] as any);

        const input = JSON.stringify({ op: "list", filepath: "." });
        const result = await fileSystemTool.execute(input);
        expect(result).toContain("📄 file1.txt");
        expect(result).toContain("📁 dir1");
    });

    it("should append content", async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        const input = JSON.stringify({ op: "append", filepath: "notes.txt", content: "more" });
        const result = await fileSystemTool.execute(input);
        expect(fs.appendFileSync).toHaveBeenCalled();
        expect(result).toContain("Appended to notes.txt");
    });

    it("should check existence", async () => {
        vi.mocked(fs.existsSync).mockReturnValueOnce(true).mockReturnValueOnce(true); // once for sandbox, once for filepath
        const input = JSON.stringify({ op: "exists", filepath: "exists.txt" });
        const result = await fileSystemTool.execute(input);
        expect(result).toBe("exists: true");
    });

    it("should delete a file", async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        const input = JSON.stringify({ op: "delete", filepath: "gone.txt" });
        const result = await fileSystemTool.execute(input);
        expect(fs.unlinkSync).toHaveBeenCalled();
        expect(result).toContain("Deleted gone.txt");
    });

    it("should create a directory", async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        const input = JSON.stringify({ op: "mkdir", filepath: "new-dir" });
        const result = await fileSystemTool.execute(input);
        expect(fs.mkdirSync).toHaveBeenCalled();
        expect(result).toContain("Directory created: new-dir");
    });
});
