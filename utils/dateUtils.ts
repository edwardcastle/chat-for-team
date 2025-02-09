export const formatLastSeen = (timestamp: string | Date | null): string => {
  if (!timestamp) return 'Never active';

  const date = new Date(timestamp);
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  };

  // Calculate differences
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  // Format time with timezone
  const timeString = date.toLocaleTimeString([], options);

  // Today/Yesterday logic
  if (diffInDays === 0) {
    return `Today at ${timeString}`;
  } else if (diffInDays === 1) {
    return `Yesterday at ${timeString}`;
  }

  // Recent week days
  if (diffInDays < 7) {
    return `${date.toLocaleDateString('en-US', { weekday: 'long' })} at ${timeString}`;
  }

  // Current year
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    })} at ${timeString}`;
  }

  // Older than a year
  return `${date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  })} at ${timeString}`;
};

export const formatTime = (timestamp: string | Date) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};