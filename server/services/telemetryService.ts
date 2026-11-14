/**
 * Corper Wee: Production Telemetry, Metrics & Error Reporting Service
 * Tracks HTTP latency, status distributions, WebSocket concurrency, and exception reports.
 */
import { randomUUID } from 'crypto';
import { config } from '../config/env.js';

export interface ErrorReportEntry {
  id: string;
  source: 'SERVER' | 'CLIENT' | 'WEBSOCKET';
  level: 'ERROR' | 'CRITICAL' | 'WARN';
  message: string;
  name: string;
  stackPreview?: string;
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  userId?: string;
  platform?: string;
  appVersion: string;
  timestamp: string;
}

const MAX_ERROR_BUFFER = 100;

class TelemetryCollector {
  private readonly startedAt = Date.now();
  private totalRequests = 0;
  private status2xx = 0;
  private status4xx = 0;
  private status5xx = 0;
  private totalDurationMs = 0;
  private maxDurationMs = 0;
  private latencySamples: number[] = [];
  private errorReports: ErrorReportEntry[] = [];

  recordHttpRequest(statusCode: number, durationMs: number) {
    this.totalRequests += 1;
    this.totalDurationMs += durationMs;
    if (durationMs > this.maxDurationMs) {
      this.maxDurationMs = durationMs;
    }
    this.latencySamples.push(durationMs);
    if (this.latencySamples.length > 500) {
      this.latencySamples.shift();
    }

    if (statusCode >= 500) {
      this.status5xx += 1;
    } else if (statusCode >= 400) {
      this.status4xx += 1;
    } else if (statusCode >= 200) {
      this.status2xx += 1;
    }
  }

  captureException(
    err: unknown,
    context: {
      source?: 'SERVER' | 'CLIENT' | 'WEBSOCKET';
      level?: 'ERROR' | 'CRITICAL' | 'WARN';
      requestId?: string;
      method?: string;
      path?: string;
      statusCode?: number;
      userId?: string;
      platform?: string;
    } = {}
  ): ErrorReportEntry {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    const entry: ErrorReportEntry = {
      id: randomUUID(),
      source: context.source || 'SERVER',
      level: context.level || 'ERROR',
      name: errorObj.name || 'Error',
      message: errorObj.message || 'Unknown error',
      stackPreview: errorObj.stack
        ? errorObj.stack.split('\n').slice(0, 6).join('\n')
        : undefined,
      requestId: context.requestId,
      method: context.method,
      path: context.path,
      statusCode: context.statusCode,
      userId: context.userId,
      platform: context.platform || 'node-backend',
      appVersion: config.releaseVersion,
      timestamp: new Date().toISOString(),
    };

    this.errorReports.unshift(entry);
    if (this.errorReports.length > MAX_ERROR_BUFFER) {
      this.errorReports.pop();
    }

    this.forwardExternal(entry);
    return entry;
  }

  captureClientError(payload: {
    message: string;
    name?: string;
    stack?: string;
    path?: string;
    platform?: string;
    userId?: string;
  }): ErrorReportEntry {
    const err = new Error(payload.message.slice(0, 500));
    err.name = (payload.name || 'ClientRuntimeError').slice(0, 80);
    if (payload.stack) {
      err.stack = payload.stack.slice(0, 1200);
    }
    return this.captureException(err, {
      source: 'CLIENT',
      level: 'ERROR',
      path: payload.path?.slice(0, 200),
      platform: payload.platform?.slice(0, 80) || 'web-android-client',
      userId: payload.userId,
    });
  }

  private forwardExternal(entry: ErrorReportEntry) {
    const webhookUrl = config.observability.errorWebhookUrl;
    if (!webhookUrl) return;
    // Non-blocking fire-and-forget dispatch to external alerting endpoint
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => {
      // Never cascade error-reporting failure back into request handlers
    });
  }

  getRecentErrors(limit = 30): ErrorReportEntry[] {
    return this.errorReports.slice(0, Math.min(MAX_ERROR_BUFFER, Math.max(1, limit)));
  }

  getSnapshot(activeWebSockets = 0) {
    const mem = process.memoryUsage();
    const sorted = [...this.latencySamples].sort((a, b) => a - b);
    const p95Index = sorted.length > 0 ? Math.floor(sorted.length * 0.95) : 0;
    const p95LatencyMs = sorted.length > 0 ? sorted[Math.min(p95Index, sorted.length - 1)] : 0;
    const avgLatencyMs =
      this.totalRequests > 0 ? Number((this.totalDurationMs / this.totalRequests).toFixed(2)) : 0;

    return {
      service: 'corper-wee-api',
      releaseVersion: config.releaseVersion,
      environment: config.env,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      http: {
        totalRequests: this.totalRequests,
        status2xx: this.status2xx,
        status4xx: this.status4xx,
        status5xx: this.status5xx,
        avgLatencyMs,
        p95LatencyMs: Number(p95LatencyMs.toFixed(2)),
        maxLatencyMs: Number(this.maxDurationMs.toFixed(2)),
      },
      realtime: {
        activeWebSockets,
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        rssMb: Number((mem.rss / (1024 * 1024)).toFixed(1)),
        heapUsedMb: Number((mem.heapUsed / (1024 * 1024)).toFixed(1)),
        heapTotalMb: Number((mem.heapTotal / (1024 * 1024)).toFixed(1)),
      },
      errorReporting: {
        bufferedErrors: this.errorReports.length,
        sentryConfigured: Boolean(config.observability.sentryDsn),
        webhookConfigured: Boolean(config.observability.errorWebhookUrl),
      },
      timestamp: new Date().toISOString(),
    };
  }

  toPrometheusMetrics(activeWebSockets = 0): string {
    const snap = this.getSnapshot(activeWebSockets);
    return [
      '# HELP corperwee_http_requests_total Total HTTP requests processed',
      '# TYPE corperwee_http_requests_total counter',
      `corperwee_http_requests_total{status="2xx"} ${snap.http.status2xx}`,
      `corperwee_http_requests_total{status="4xx"} ${snap.http.status4xx}`,
      `corperwee_http_requests_total{status="5xx"} ${snap.http.status5xx}`,
      '# HELP corperwee_http_request_duration_ms_avg Average HTTP request latency in milliseconds',
      '# TYPE corperwee_http_request_duration_ms_avg gauge',
      `corperwee_http_request_duration_ms_avg ${snap.http.avgLatencyMs}`,
      '# HELP corperwee_http_request_duration_ms_p95 95th percentile HTTP latency in milliseconds',
      '# TYPE corperwee_http_request_duration_ms_p95 gauge',
      `corperwee_http_request_duration_ms_p95 ${snap.http.p95LatencyMs}`,
      '# HELP corperwee_websocket_connections_active Active multiplayer WebSocket connections',
      '# TYPE corperwee_websocket_connections_active gauge',
      `corperwee_websocket_connections_active ${snap.realtime.activeWebSockets}`,
      '# HELP corperwee_process_heap_used_mb Node.js heap used in MB',
      '# TYPE corperwee_process_heap_used_mb gauge',
      `corperwee_process_heap_used_mb ${snap.process.heapUsedMb}`,
      '# HELP corperwee_errors_buffered_total Recent errors captured in telemetry ring buffer',
      '# TYPE corperwee_errors_buffered_total gauge',
      `corperwee_errors_buffered_total ${snap.errorReporting.bufferedErrors}`,
      '',
    ].join('\n');
  }
}

export const TelemetryService = new TelemetryCollector();
