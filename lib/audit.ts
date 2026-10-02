import * as cheerio from 'cheerio';
export type AuditIssue = {
  severity: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  message: string;
  evidence: string;
  fix: string;
  urls: string[];
};

export type AuditResult = {
  url: string;
  status: number;
  title: string;
  description: string;
  h1s: string[];
  wordCount: number;
  images: number;
  imagesMissingAlt: number;
  schemas: string[];
  internalLinks: number;
  externalLinks: number;
  score: number;
  issues: AuditIssue[];
};
