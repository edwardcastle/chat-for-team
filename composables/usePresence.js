// composables/usePresence.js
export const usePresence = () => {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    const onlineUsers = ref([])
    let presenceChannel = null
    let heartbeatInterval = null

    const updatePresence = async (online) => {
        await supabase
            .from('online_users')
            .upsert({
                user_id: user.value.id,
                username: user.value.user_metadata?.username,
                online,
                last_seen: new Date().toISOString()
            })
    }

    const setupPresence = async () => {
        // Initialize as offline first
        await updatePresence(false)

        // Create presence channel
        presenceChannel = supabase.channel('global-presence', {
            config: {
                presence: {
                    key: user.value.id
                }
            }
        })

        // Subscribe to presence changes
        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                onlineUsers.value = Object.values(presenceChannel.presenceState())
                    .map(entry => entry[0])
                    .filter(user => user.online)
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({
                        user_id: user.value.id,
                        username: user.value.user_metadata?.username,
                        online: true
                    })
                    await updatePresence(true)
                }
            })

        // Heartbeat to maintain presence
        heartbeatInterval = setInterval(() => updatePresence(true), 15000)
    }

    const cleanupPresence = async () => {
        if (presenceChannel) {
            await presenceChannel.untrack()
            presenceChannel.unsubscribe()
        }
        if (heartbeatInterval) clearInterval(heartbeatInterval)
        await updatePresence(false)
    }

    return { onlineUsers, setupPresence, cleanupPresence }
}