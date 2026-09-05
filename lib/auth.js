import { supabase } from './supabaseClient';

// Mengambil profil user yang sedang login. Return null kalau belum login.
export async function getCurrentProfile() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;

  const userId = sessionData.session.user.id;
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return profile;
}
