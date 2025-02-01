import { defineNuxtPlugin } from '#app'
import { useSupabaseClient } from '#imports'
import { useSupabaseUser } from '#imports'
import { usePresence } from '@/composables/usePresence'

export default defineNuxtPlugin(() => {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    const router = useRouter()
    const { setupPresence, cleanupPresence } = usePresence()

    // Handle auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        user.value = session?.user || null

        if (event === 'SIGNED_IN') {
            await setupPresence()
            await router.push('/')
        }

        if (event === 'SIGNED_OUT') {
            await cleanupPresence()
            await router.push('/login')
        }
    })

    return {
        provide: {
            auth: {
                // Login method
                async login(credentials) {
                    const { error } = await supabase.auth.signInWithPassword(credentials)
                    if (error) throw error
                },

                // Logout method
                async logout() {
                    await supabase.auth.signOut()
                },

                // Registration method
                async register({ email, password, username }) {
                    const { data, error } = await supabase.auth.signUp({ email, password })
                    if (error) throw error

                    if (data.user) {
                        await supabase
                            .from('profiles')
                            .insert({ user_id: data.user.id, username })
                    }
                }
            }
        }
    }
})