export default defineNuxtRouteMiddleware(async (to) => {
    const supabase = useSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    const publicRoutes = ['/login', '/register']

    if (!user && !publicRoutes.includes(to.path)) {
        return navigateTo('/login', { replace: true })
    }

    if (user && publicRoutes.includes(to.path)) {
        return navigateTo('/', { replace: true })
    }
})