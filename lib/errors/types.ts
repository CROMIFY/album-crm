export type SentryIssueLevel = "fatal" | "error" | "warning" | "info" | "debug";
export type SentryIssueStatus = "unresolved" | "resolved" | "ignored";

export type ErrorProject = "album-crm" | "album-landing-page" | "album-api" | "album-app";

export type SentryIssue = {
  id: string;
  shortId: string | null;
  title: string;
  culprit: string | null;
  project: ErrorProject;
  level: SentryIssueLevel;
  status: SentryIssueStatus;
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  permalink: string | null;
};

export type SentryTag = { key: string; value: string };

export type SentryBreadcrumb = {
  type: string;
  category: string | null;
  message: string | null;
  level: string | null;
  timestamp: string | null;
};

export type SentryStackFrame = {
  filename: string | null;
  function: string | null;
  lineNo: number | null;
  colNo: number | null;
  context: [number, string][];
  inApp: boolean;
};

export type SentryFrequencyPoint = { date: string; count: number };

export type SentryIssueDetail = SentryIssue & {
  stackFrames: SentryStackFrame[];
  breadcrumbs: SentryBreadcrumb[];
  tags: SentryTag[];
  frequency: SentryFrequencyPoint[];
};
