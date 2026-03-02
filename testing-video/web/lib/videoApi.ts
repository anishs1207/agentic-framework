/**
 * API Client for the Python Video Processing Backend
 * Handles all communication with the video processing server
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface UploadResponse {
  file_id: string;
  filename: string;
  path: string;
  metadata: {
    duration: number;
    fps: number;
    width: number;
    height: number;
    has_audio: boolean;
  };
}

export interface TranscriptionResult {
  text: string;
  language: string;
  segments: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
  }>;
  word_timestamps: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface AudioAnalysis {
  file_id: string;
  segments: Array<{
    start: number;
    end: number;
    duration: number;
  }>;
  total_speech_duration: number;
  total_duration: number;
}

export interface JobStatus {
  status: "processing" | "completed" | "failed";
  type?: string;
  output_path?: string;
  output_filename?: string;
  error?: string;
  segments?: Array<{ start: number; end: number; duration: number }>;
  original_duration?: number;
  new_duration?: number;
  text?: string;
  word_timestamps?: Array<{ word: string; start: number; end: number }>;
}

export interface ColorCorrectionParams {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  vibrance: number;
  auto_enhance: boolean;
}

export interface BrainrotParams {
  main_video_id: string;
  brainrot_video_id: string;
  layout: "vertical" | "horizontal";
  brainrot_position: "top" | "bottom" | "left" | "right";
  main_video_ratio: number;
}

class VideoAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if the API server is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Upload a video file for processing
   */
  async uploadVideo(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Upload failed" }));
      throw new Error(error.detail || "Upload failed");
    }

    return response.json();
  }

  /**
   * Delete an uploaded video
   */
  async deleteUpload(fileId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/upload/${fileId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete file");
    }
  }

  /**
   * Start transcription for a video
   */
  async startTranscription(
    fileId: string,
  ): Promise<{ job_id: string; status: string }> {
    const response = await fetch(`${this.baseUrl}/api/transcribe/${fileId}`, {
      method: "POST",
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Transcription failed" }));
      throw new Error(error.detail || "Transcription failed");
    }

    return response.json();
  }

  /**
   * Get transcription status
   */
  async getTranscriptionStatus(jobId: string): Promise<JobStatus> {
    const response = await fetch(
      `${this.baseUrl}/api/transcribe/status/${jobId}`,
    );

    if (!response.ok) {
      throw new Error("Failed to get transcription status");
    }

    return response.json();
  }

  /**
   * Analyze audio for speech segments
   */
  async analyzeAudio(
    fileId: string,
    silenceThreshold: number = -40,
  ): Promise<AudioAnalysis> {
    const params = new URLSearchParams({
      silence_threshold: silenceThreshold.toString(),
    });
    const response = await fetch(
      `${this.baseUrl}/api/analyze-audio/${fileId}?${params}`,
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Analysis failed" }));
      throw new Error(error.detail || "Analysis failed");
    }

    return response.json();
  }

  /**
   * Start auto-cut processing
   */
  async startAutoCut(
    fileId: string,
    options: {
      silence_threshold?: number;
      min_silence_duration?: number;
      padding?: number;
    } = {},
  ): Promise<{ job_id: string; status: string }> {
    const params = new URLSearchParams();
    if (options.silence_threshold !== undefined) {
      params.append("silence_threshold", options.silence_threshold.toString());
    }
    if (options.min_silence_duration !== undefined) {
      params.append(
        "min_silence_duration",
        options.min_silence_duration.toString(),
      );
    }
    if (options.padding !== undefined) {
      params.append("padding", options.padding.toString());
    }

    const response = await fetch(
      `${this.baseUrl}/api/autocut/${fileId}?${params}`,
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Auto-cut failed" }));
      throw new Error(error.detail || "Auto-cut failed");
    }

    return response.json();
  }

  /**
   * Start brainrot video combination
   */
  async startBrainrotCombine(
    params: BrainrotParams,
  ): Promise<{ job_id: string; status: string }> {
    const response = await fetch(`${this.baseUrl}/api/brainrot/combine`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Brainrot combine failed" }));
      throw new Error(error.detail || "Brainrot combine failed");
    }

    return response.json();
  }

  /**
   * Start color correction
   */
  async startColorCorrection(
    fileId: string,
    params: ColorCorrectionParams,
  ): Promise<{ job_id: string; status: string }> {
    const response = await fetch(
      `${this.baseUrl}/api/color-correct/${fileId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      },
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Color correction failed" }));
      throw new Error(error.detail || "Color correction failed");
    }

    return response.json();
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await fetch(`${this.baseUrl}/api/job/${jobId}`);

    if (!response.ok) {
      throw new Error("Failed to get job status");
    }

    return response.json();
  }

  /**
   * Poll job until completion
   */
  async pollJobUntilComplete(
    jobId: string,
    onProgress?: (status: JobStatus) => void,
    pollInterval: number = 1000,
    maxAttempts: number = 300,
  ): Promise<JobStatus> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const status = await this.getJobStatus(jobId);

      if (onProgress) {
        onProgress(status);
      }

      if (status.status === "completed" || status.status === "failed") {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      attempts++;
    }

    throw new Error("Job timed out");
  }

  /**
   * Get download URL for a processed file
   */
  getDownloadUrl(filename: string): string {
    return `${this.baseUrl}/api/download/${filename}`;
  }

  /**
   * Download a processed file
   */
  async downloadFile(filename: string): Promise<Blob> {
    const response = await fetch(this.getDownloadUrl(filename));

    if (!response.ok) {
      throw new Error("Failed to download file");
    }

    return response.blob();
  }
}

// Export singleton instance
export const videoAPI = new VideoAPIClient();

// Also export the class for custom instances
export { VideoAPIClient };
