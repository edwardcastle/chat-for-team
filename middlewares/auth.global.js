export default defineNuxtRouteMiddleware(async (to) => {
    const { $auth } = useNuxtApp()
    const user = useSupabaseUser()

    // Redirect to login if not authenticated
    if (!user.value && to.path !== '/login' && to.path !== '/register') {
        return navigateTo('/login')
    }

    // Redirect to home if authenticated and trying to access auth pages
    if (user.value && (to.path === '/login' || to.path === '/register')) {
        return navigateTo('/')
    }
})