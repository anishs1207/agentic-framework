import { vi, describe, it, expect, beforeEach } from "vitest";
import https from "https";
import http from "http";
import { httpFetchTool } from "../src/tools/httpFetch.js";
import { EventEmitter } from "events";

vi.mock("https");
vi.mock("http");

describe("HttpFetch Tool", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    interface MockRequest extends EventEmitter {
        setTimeout: ReturnType<typeof vi.fn>;
        destroy: ReturnType<typeof vi.fn>;
        write: ReturnType<typeof vi.fn>;
        end: ReturnType<typeof vi.fn>;
    }

    interface MockResponse extends EventEmitter {
        statusCode?: number;
        statusMessage?: string;
    }

    function createMockRequest(): MockRequest {
        const req = new EventEmitter() as unknown as MockRequest;
        req.setTimeout = vi.fn();
        req.destroy = vi.fn();
        req.write = vi.fn();
        req.end = vi.fn();
        return req;
    }

    function createMockResponse(status: number, statusMsg: string, body: string): MockResponse {
        const res = new EventEmitter() as unknown as MockResponse;
        res.statusCode = status;
        res.statusMessage = statusMsg;
        setTimeout(() => {
            res.emit("data", Buffer.from(body));
            res.emit("end");
        }, 10);
        return res;
    }

    it("should perform successful GET request via HTTPS", async () => {
        const req = createMockRequest();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(https.request).mockImplementation((_options: any, callback?: any) => {
            // In httpFetch, it's called as request(options, callback)
            const actualCallback = typeof _options === 'function' ? _options : callback;
            const res = createMockResponse(200, "OK", "Success body");
            if (actualCallback) actualCallback(res);
            return req as unknown as http.ClientRequest;
        });

        const input = JSON.stringify({ url: "https://example.com/api" });
        const result = await httpFetchTool.execute(input);

        expect(result).toContain("HTTP 200 OK");
        expect(result).toContain("Success body");
        expect(https.request).toHaveBeenCalled();
    });

    it("should perform successful POST request via HTTP", async () => {
        const req = createMockRequest();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(http.request).mockImplementation((_options: any, callback?: any) => {
            const actualCallback = typeof _options === 'function' ? _options : callback;
            const res = createMockResponse(201, "Created", "{}");
            if (actualCallback) actualCallback(res);
            return req as unknown as http.ClientRequest;
        });

        const input = JSON.stringify({ url: "http://example.com/post", method: "POST", body: '{"a":1}' });
        const result = await httpFetchTool.execute(input);

        expect(result).toContain("HTTP 201 Created");
        expect(req.write).toHaveBeenCalledWith('{"a":1}');
        expect(http.request).toHaveBeenCalled();
    });

    it("should handle request timeout", async () => {
        const req = createMockRequest();
        vi.mocked(https.request).mockImplementation(() => {
            return req as unknown as http.ClientRequest;
        });

        req.setTimeout.mockImplementation((_ms: number, cb: () => void) => {
            cb();
        });

        const input = JSON.stringify({ url: "https://slow.com", timeout: 2000 });
        const result = await httpFetchTool.execute(input);
        expect(result).toContain("ERROR: Request timed out");
    });

    it("should handle network errors", async () => {
        const req = createMockRequest();
        vi.mocked(https.request).mockImplementation(() => {
            setTimeout(() => req.emit("error", new Error("DNS resolution failed")), 10);
            return req as unknown as http.ClientRequest;
        });

        const input = JSON.stringify({ url: "https://broken.com" });
        const result = await httpFetchTool.execute(input);
        expect(result).toContain("ERROR: DNS resolution failed");
    });
});
