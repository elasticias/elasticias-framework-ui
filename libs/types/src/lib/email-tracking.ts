export interface EmailMetricsDailyPoint {
  day: string;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
}

export interface EmailMetricsCategoryBreakdown {
  category: string;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
}

export interface EmailMetrics {
  from: string;
  to: string;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  spam: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  daily: EmailMetricsDailyPoint[];
  categories: EmailMetricsCategoryBreakdown[];
}

export type EmailEventKind =
  | 'Unknown'
  | 'Sent'
  | 'Delivered'
  | 'Open'
  | 'Click'
  | 'SoftBounce'
  | 'HardBounce'
  | 'Spam'
  | 'Unsubscribe';

export interface EmailEventRecord {
  messageId: string;
  category: string;
  recipient: string;
  kind: EmailEventKind;
  occurredAt: string;
  url?: string | null;
  reason?: string | null;
}
