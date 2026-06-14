// Queue item status → display label + color. Labels are English defaults;
// translate via i18n at the call site if needed.
export const QUEUE_STATUS = {
  downloading: { label: 'Extracting', color: 'var(--primary)' },
  queued: { label: 'Waiting for allocation', color: 'var(--text-secondary)' },
  paused: { label: 'Paused', color: 'var(--text-secondary)' },
  completed: { label: 'Completed', color: 'var(--text-success)' },
  error: { label: 'Failed', color: 'var(--text-error)' },
};
