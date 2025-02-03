import {navigateTo} from "#imports";

export default defineNuxtPlugin(async (nuxtApp) => {
    const supabase = useSupabaseClient()
    const { setUser, loadUser } = useUser()

    // Initial auth check
    await loadUser()

    // Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        await loadUser()
    })

    // Cleanup
    nuxtApp.hook('app:cleanup', () => {
        subscription?.unsubscribe()
    })

    return {
        provide: {
            auth: {
                async login({ email, password }) {
                    const { error } = await supabase.auth.signInWithPassword({
                        email,
                        password
                    })
                    if (error) throw error
                    await loadUser()
                    navigateTo('/')
                },

                async register({ email, password, username }) {
                    const { error } = await supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            data: { username }
                        }
                    })
                    if (error) throw error
                },
                async logout() {
                    const { error } = await supabase.auth.signOut()
                    if (error) throw error
                    setUser(null)
                }
            }
        }
    }
})