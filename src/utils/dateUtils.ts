export const DateUtils = {
  formatDate(dateString: string | undefined): string {
    if (!dateString) {
      return '';
    }

    try {
      let date: Date;

      if (/^\d+$/.test(dateString.trim())) {
        date = new Date(Number.parseInt(dateString.trim()));
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
        const [year, month, day] = dateString.trim().split('-').map(Number);
        date = new Date(Date.UTC(year, month - 1, day));
      } else {
        date = new Date(dateString);
      }

      if (Number.isNaN(date.getTime())) {
        return dateString;
      }

      return date.toLocaleDateString('en-US', { timeZone: 'UTC' });
    } catch (error) {
      console.warn(`Error formatting date "${dateString}":`, error);
      return dateString;
    }
  },

  /**
   * Whole calendar days from today (browser-local date) to the expiry date.
   * Bare `YYYY-MM-DD` is read as a local calendar date, matching the backend,
   * which computes days-until-expiry from Home Assistant's local date.
   * Returns null for empty or unparseable input.
   */
  daysUntilExpiry(dateString: string | undefined): number | null {
    if (!dateString) {
      return null;
    }

    const trimmed = dateString.trim();
    let year: number, month: number, day: number;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      [year, month, day] = trimmed.split('-').map(Number);
    } else {
      let parsed: Date;
      try {
        parsed = new Date(trimmed);
      } catch {
        return null;
      }
      if (Number.isNaN(parsed.getTime())) {
        return null;
      }
      year = parsed.getFullYear();
      month = parsed.getMonth() + 1;
      day = parsed.getDate();
    }

    const now = new Date();
    // Compare calendar dates via UTC epoch days so DST shifts can't skew the count.
    const expiryDay = Date.UTC(year, month - 1, day);
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.round((expiryDay - today) / (1000 * 60 * 60 * 24));
    return Number.isNaN(diff) ? null : diff;
  },

  isExpired(dateString: string | undefined): boolean {
    const days = DateUtils.daysUntilExpiry(dateString);
    return days !== null && days < 0;
  },

  isExpiringSoon(expiryDate: string, threshold: number = 7): boolean {
    const days = DateUtils.daysUntilExpiry(expiryDate);
    return days !== null && days >= 0 && days <= threshold;
  },

  isValidDate(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      return !Number.isNaN(date.getTime());
    } catch {
      return false;
    }
  },
};
