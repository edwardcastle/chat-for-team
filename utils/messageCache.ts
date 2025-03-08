export const messageCache = new Map();

export const saveMessagesToLocalStorage = (channelId: string, messages: any[]) => {
  try {
    localStorage.setItem(`messages_${channelId}`, JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to save messages to localStorage:', error);
  }
};

export const getMessagesFromLocalStorage = (channelId: string) => {
  try {
    const storedMessages = localStorage.getItem(`messages_${channelId}`);
    return storedMessages ? JSON.parse(storedMessages) : [];
  } catch (error) {
    console.error('Failed to get messages from localStorage:', error);
    return [];
  }
};

export const clearMessageCache = (): void => {
  messageCache.clear();
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('messages_')) {
      localStorage.removeItem(key);
    }
  });
};