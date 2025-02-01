export const useChat = () => {
    const supabase = useSupabaseClient()
    const messages = ref([])
    const channels = ref([])
    const currentChannel = ref(null)
    const messagesContainer = ref(null)

    const loadChannels = async () => {
        const {data} = await supabase
            .from('channels')
            .select('*')
            .order('created_at')
        channels.value = data
        if (data.length > 0) currentChannel.value = data[0]
    }

    const setupRealtime = () => {
        const channel = supabase
            .channel('filtered-messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `channel_id=eq.${currentChannel.value?.id}`
            }, async (payload) => {
                const {data: profile} = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('user_id', payload.new.user_id)
                    .single()

                messages.value = [
                    ...messages.value,
                    {
                        ...payload.new,
                        profiles: {username: profile?.username}
                    }
                ]
                scrollToBottom()
            })
            .subscribe()

        return channel
    }

    const loadMessages = async () => {
        if (!currentChannel.value?.id) return

        const {data} = await supabase
            .from('messages')
            .select(`
        id,
        content,
        created_at,
        profiles (username)
      `)
            .eq('channel_id', currentChannel.value.id)
            .order('created_at', {ascending: true})

        messages.value = data || []
    }

    const scrollToBottom = () => {
        nextTick(() => {
            if (messagesContainer.value) {
                messagesContainer.value.scrollTo({
                    top: messagesContainer.value.scrollHeight,
                    behavior: 'smooth'
                })
            }
        })
    }

    return {messages, channels, currentChannel, loadChannels, setupRealtime, loadMessages, scrollToBottom}
}