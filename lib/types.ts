// Shared types across the app

export interface PdfOptions {
  format: "A4" | "Letter" | "fullpage";
  margins: "none" | "small" | "normal";
  maxScrolls: number; // 0 = unlimited
  scrollDelay: "fast" | "normal" | "slow";
  includeBackground: boolean;
}

export interface ProgressEvent {
  stage: "fetching" | "scrolling" | "rendering" | "generating" | "done" | "error";
  message: string;
  scrollCount?: number;
  maxScrolls?: number;
  percent: number;
}

export type AppState =
  | { status: "idle" }
  | { status: "loading"; progress: ProgressEvent }
  | { status: "success"; downloadUrl: string; filename: string; sizeKb: number }
  | { status: "error"; message: string };
