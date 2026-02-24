import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMessageMock } = vi.hoisted(() => {
  const sendMessageMock = vi.fn();
  return { sendMessageMock };
});

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      sendMessage: sendMessageMock,
    },
  },
}));

const { createHideReporter } = await import('@shared/report-hidden');

describe('createHideReporter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should deduplicate same element tracked twice', () => {
    const reporter = createHideReporter('ai');
    const el = document.createElement('div');

    reporter.track(el);
    reporter.track(el);

    vi.advanceTimersByTime(500);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ count: 1 }),
    );
  });

  it('should debounce multiple track calls into a single message', () => {
    const reporter = createHideReporter('sponsored');

    reporter.track(document.createElement('div'));
    reporter.track(document.createElement('span'));
    reporter.track(document.createElement('p'));

    // Not yet fired
    expect(sendMessageMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'REPORT_CSS_HIDDEN',
        count: 3,
        category: 'sponsored',
      }),
    );
  });

  it('should send correct message payload', () => {
    const reporter = createHideReporter('shopping');

    reporter.track(document.createElement('div'));
    vi.advanceTimersByTime(500);

    expect(sendMessageMock).toHaveBeenCalledWith({
      type: 'REPORT_CSS_HIDDEN',
      domain: 'localhost',
      count: 1,
      category: 'shopping',
    });
  });

  it('should start fresh count after flush', () => {
    const reporter = createHideReporter('ai');

    reporter.track(document.createElement('div'));
    vi.advanceTimersByTime(500);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ count: 1 }),
    );

    // New elements after flush
    reporter.track(document.createElement('span'));
    reporter.track(document.createElement('p'));
    vi.advanceTimersByTime(500);

    expect(sendMessageMock).toHaveBeenCalledTimes(2);
    expect(sendMessageMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ count: 2 }),
    );
  });

  it('should not send message when count is zero after flush', () => {
    const reporter = createHideReporter('ai');
    const el = document.createElement('div');

    reporter.track(el);
    vi.advanceTimersByTime(500);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);

    // Track same element again (deduplicated, count stays 0)
    reporter.track(el);
    vi.advanceTimersByTime(500);

    // No additional message sent
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
  });

  it('should silently handle sendMessage errors', () => {
    sendMessageMock.mockImplementation(() => {
      throw new Error('Extension context invalidated');
    });

    const reporter = createHideReporter('ai');
    reporter.track(document.createElement('div'));

    // Should not throw
    expect(() => vi.advanceTimersByTime(500)).not.toThrow();
  });
});
