import type { MessageWithProfile } from '~/types/database.types';

export const messageCache = new Map();

export const saveMessagesToLocalStorage = (channelId: string, messages: MessageWithProfile[]) => {
  try {
    localStorage.setItem(`messages_${channelId}`, JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to save messages:', error);
  }
};

export const getMessagesFromLocalStorage = (channelId: string) => {
  try {
    const stored = localStorage.getItem(`messages_${channelId}`);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to load messages:', error);
    return null;
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