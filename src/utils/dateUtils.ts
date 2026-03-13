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
        date = new Date(year, month - 1, day);
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

  isExpired(dateString: string | undefined): boolean {
    if (!dateString) {
      return false;
    }

    try {
      const inputDate = new Date(dateString);
      if (Number.isNaN(inputDate.getTime())) {
        return false;
      }

      const now = new Date();

      const inputDateString = inputDate.toISOString().split('T')[0];
      const nowDateString = now.toISOString().split('T')[0];

      return inputDateString < nowDateString;
    } catch {
      return false;
    }
  },

  isExpiringSoon(expiryDate: string, threshold: number = 7): boolean {
    if (!expiryDate) {
      return false;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expiry = new Date(expiryDate);
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays >= 0 && diffDays <= threshold;
    } catch {
      return false;
    }
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
