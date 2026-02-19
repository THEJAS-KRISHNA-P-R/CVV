import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check user role and redirect accordingly
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check if profile exists
        let { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        // Create profile if it doesn't exist (new OAuth user)
        if (!profile) {
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
              role: 'citizen', // Default role for new users
              green_credits: 0,
              preferred_language: 'en',
            })
            .select('role')
            .single()
          
          profile = newProfile
        }

        // Redirect based on role
        if (profile?.role === 'admin') {
          return NextResponse.redirect(`${origin}/admin/dashboard`)
        } else if (profile?.role === 'worker') {
          return NextResponse.redirect(`${origin}/worker/dashboard`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
