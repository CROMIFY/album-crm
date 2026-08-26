export type DeployStatus = "ready" | "error" | "building" | "canceled" | "queued";
export type DeployProvider = "vercel" | "render";

export type DeployItem = {
  id: string;
  project: string;
  provider: DeployProvider;
  status: DeployStatus;
  url: string | null;
  commitMessage: string | null;
  commitAuthor: string | null;
  createdAt: string;
  target: string | null;
};
