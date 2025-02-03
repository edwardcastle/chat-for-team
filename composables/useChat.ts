import { useSupabaseClient } from '#imports'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface Message {
    id: string
    content: string
    created_at: string
    user_id: string
    profiles?: {
        username: string
    }
}

interface Channel {
    id: string
    name: string
    description?: string
    created_at: string
    members?: string[]
}

export const useChat = () => {
    const supabase = useSupabaseClient()
    const { user } = useUser()

    // Reactive state
    const messages = ref<Message[]>([])
    const channels = ref<Channel[]>([])
    const currentChannel = ref<Channel | null>(null)
    const messagesContainer = ref<HTMLElement | null>(null)

    // Channel operations
    const loadChannels = async (): Promise<void> => {
        try {
            const { data, error } = await supabase
                .from('channels')
                .select('*')
                .order('created_at', { ascending: true })

            if (!error) channels.value = data
        } catch (error) {
            console.error('Channel load error:', error)
            throw new Error('Failed to load channels')
        }
    }

    // Message operations
    const loadMessages = async (): Promise<void> => {
        if (!currentChannel.value?.id) return

        try {
            const { data, error } = await supabase
                .from('messages')
                .select(`
          id, 
          content, 
          created_at, 
          user_id,
          profiles (username)
        `)
                .eq('channel_id', currentChannel.value.id)
                .order('created_at', { ascending: true })

            if (!error) messages.value = data || []
            scrollToBottom()
        } catch (error) {
            console.error('Message load error:', error)
            throw new Error('Failed to load messages')
        }
    }

    const sendMessage = async (content: string): Promise<void> => {
        if (!content.trim() || !currentChannel.value?.id || !user.value?.id) return

        try {
            const { error } = await supabase
                .from('messages')
                .insert({
                    content,
                    channel_id: currentChannel.value.id,
                    user_id: user.value.id
                })

            if (error) throw error
        } catch (error) {
            console.error('Message send error:', error)
            throw new Error('Failed to send message')
        }
    }

    // Realtime functionality
    const setupRealtime = (): RealtimeChannel => {
        const channel = supabase
            .channel('realtime-messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `channel_id=eq.${currentChannel.value?.id}`
            }, (payload: RealtimePostgresChangesPayload<Message>) => {
                if (payload.new) {
                    messages.value = [...messages.value, payload.new]
                    scrollToBottom()
                }
            })

        channel.subscribe()
        return channel
    }

    // UI utilities
    const scrollToBottom = (): void => {
        nextTick(() => {
            if (messagesContainer.value) {
                messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
            }
        })
    }

    return {
        messages,
        channels,
        currentChannel,
        messagesContainer,
        loadChannels,
        loadMessages,
        sendMessage,
        setupRealtime,
        scrollToBottom
    }
}