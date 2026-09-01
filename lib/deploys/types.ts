export type DeployStatus = "ready" | "error" | "building" | "canceled" | "queued";
export type DeployProvider = "vercel" | "render";
export type JobKey = "album-crm" | "album-landing-page" | "album-api";

export type DeployItem = {
  id: string;
  jobKey: JobKey;
  project: string;
  provider: DeployProvider;
  status: DeployStatus;
  url: string | null;
  commitMessage: string | null;
  commitAuthor: string | null;
  branch: string | null;
  target: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
};

export type JobSummary = {
  key: JobKey;
  label: string;
  provider: DeployProvider;
  lastBuild: DeployItem | null;
};

export type BuildLogLine = {
  type: "stdout" | "stderr" | "other";
  text: string;
};

export type BuildDetail = DeployItem & {
  logs: BuildLogLine[] | null;
  logsUnavailableReason: string | null;
};

export type DeployHistoryPage = {
  items: DeployItem[];
  nextCursor: string | null;
};
