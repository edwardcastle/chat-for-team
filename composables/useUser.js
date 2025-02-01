import { useSupabaseUser } from '#imports'

export const useUser = () => {
    const user = useSupabaseUser()

    const isLoggedIn = computed(() => !!user.value)

    const username = computed(() =>
        user.value?.user_metadata?.username ||
        user.value?.email?.split('@')[0] ||
        'Anonymous'
    )

    return {
        user,
        isLoggedIn,
        username
    }
}