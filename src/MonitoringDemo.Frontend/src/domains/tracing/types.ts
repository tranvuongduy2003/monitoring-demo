import type { QueryExample } from '@/shared/types/query';

export interface TraceOverview {
  available: boolean;
  windowMinutes: number;
  indexedTraceCount: number;
  analytics: TraceAnalytics;
  propagationAnalytics: TracePropagationAnalytics;
  traces: TraceDetail[];
  queries: QueryExample[];
  message?: string;
}

export interface TraceAnalytics {
  traceCount: number;
  spanCount: number;
  errorTraceCount: number;
  errorSpanCount: number;
  averageDurationMilliseconds: number;
  p95DurationMilliseconds: number;
  statusCounts: Record<string, number>;
  durationBuckets: TraceDurationBucket[];
  operations: TraceOperation[];
}

export interface TraceDetail {
  traceId: string;
  rootServiceName: string;
  rootSpanName: string;
  startedAt: string;
  durationMilliseconds: number;
  status: string;
  spans: TraceSpan[];
  propagation: TracePropagation;
}

export interface TraceSpan {
  spanId: string;
  parentSpanId?: string;
  name: string;
  serviceName: string;
  kind: string;
  startedAt: string;
  durationMilliseconds: number;
  status: string;
  attributes: Record<string, string>;
  events: TraceSpanEvent[];
}

export interface TraceSpanEvent {
  name: string;
  timestamp: string;
  attributes: Record<string, string>;
}

export interface TraceDurationBucket {
  label: string;
  count: number;
}

export interface TraceOperation {
  name: string;
  count: number;
  errorCount: number;
  averageDurationMilliseconds: number;
  p95DurationMilliseconds: number;
}

export interface TracePropagationAnalytics {
  propagatedTraceCount: number;
  totalHops: number;
  successfulHops: number;
  traceParentHeaderCount: number;
  traceStateHeaderCount: number;
  baggageItemCount: number;
  contextContinuityPercent: number;
  transports: PropagationTransportAnalytics[];
  baggageKeys: PropagatedBaggageKey[];
}

export interface PropagationTransportAnalytics {
  transport: string;
  hopCount: number;
  successfulHopCount: number;
  averageReceiverDurationMilliseconds: number;
}

export interface PropagatedBaggageKey {
  key: string;
  occurrences: number;
  sampleValue: string;
}

export interface TracePropagation {
  traceParent: string;
  traceState: string;
  baggage: Record<string, string>;
  hops: TracePropagationHop[];
}

export interface TracePropagationHop {
  transport: string;
  senderSpanId: string;
  receiverSpanId: string;
  senderName: string;
  receiverName: string;
  receiverService: string;
  durationMilliseconds: number;
  traceParent: string;
  traceState: string;
  baggage: Record<string, string>;
  contextValid: boolean;
}

export interface TraceSeedResult {
  seeded: number;
  exported: number;
  traceIds: string[];
  message: string;
}
