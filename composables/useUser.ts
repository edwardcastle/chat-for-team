export const useUser = () => {
    const user = useState<User | null>('user', () => null)
    const supabase = useSupabaseClient()

    const loadUser = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        user.value = authUser
    }

    const setUser = (newUser: User | null) => {
        user.value = newUser
    }

    return {
        user: readonly(user),
        loadUser,
        setUser,
        isLoggedIn: computed(() => !!user.value),
        currentUserId: computed(() => user.value?.id)
    }
}