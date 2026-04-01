export type IngestFileStatus = 'pending' | 'processing' | 'done' | 'failed';
export type IngestRunStatus = 'running' | 'done' | 'failed';
export type IngestTriggeredBy = 'watch' | 'manual';

export type ParseResult = {
  text: string;
};

export type ClassifyResult = {
  kind: 'sop' | 'vendor_note' | 'contact' | 'infrastructure_note' | 'recovery_procedure';
  title: string;
  summary: string;
};
