// lib/auth.ts - Configurazione NextAuth v5 con Google OAuth

import NextAuth from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import GoogleProvider from 'next-auth/providers/google';
import { supabaseServer } from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  callbacks: {
    /**
     * Callback jwt - Eseguito quando si crea/aggiorna il JWT
     * Qui controlliamo se l'utente è invitato e attivo
     */
    async jwt({ token, user }) {
      // Al primo login, salviamo l'user nel DB
      if (user && user.email) {
        const email = user.email;

        // Verifica se l'utente esiste in Supabase
        const { data: existingUser, error: fetchError } = await supabaseServer
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (fetchError && fetchError.code === 'PGRST116') {
          // Utente non esiste - controllare se invitato
          const { data: invitation } = await supabaseServer
            .from('invitations')
            .select('*')
            .eq('email', email)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single();

          if (invitation) {
            // Crea nuovo utente dal database con il ruolo dell'invito
            const { error: createError } = await supabaseServer
              .from('users')
              .insert([
                {
                  email,
                  name: user.name || email.split('@')[0],
                  google_id: user.id,
                  role: invitation.role,
                  is_active: true,
                },
              ]);

            if (!createError) {
              // Segna l'invito come usato
              await supabaseServer
                .from('invitations')
                .update({ used: true })
                .eq('id', invitation.id);

              token.userId = user.id;
              token.role = invitation.role;
              token.active = true;
            }
          } else {
            // Utente non invitato - non può accedere
            token.active = false;
            token.error = 'NOT_INVITED';
          }
        } else if (existingUser) {
          // Utente esiste
          token.userId = existingUser.id;
          token.role = existingUser.role;
          token.active = existingUser.is_active;

          if (!existingUser.is_active) {
            token.error = 'USER_INACTIVE';
          }

          // Aggiorna google_id se non lo aveva
          if (!existingUser.google_id && user.id) {
            await supabaseServer
              .from('users')
              .update({ google_id: user.id })
              .eq('id', existingUser.id);
          }
        }
      }

      return token;
    },

    /**
     * Callback session - Eseguito a ogni richiesta autenticata
     * Aggiunge dati dell'utente alla sessione
     */
    async session({ session, token }: { session: any; token: JWT }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.active = token.active as boolean;

        if (token.error) {
          session.user.error = token.error as string;
        }
      }

      return session;
    },

    /**
     * Callback redirect - Dove mandare l'utente dopo il login
     */
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // Se url è relativo, ritorna il baseUrl + url
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Se url è dello stesso dominio, ritorna come è
      else if (new URL(url).origin === baseUrl) return url;
      // Altrimenti, vai alla dashboard
      return `${baseUrl}/dashboard`;
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 giorni
    updateAge: 24 * 60 * 60, // Aggiorna ogni 24 ore
  },

  events: {
    /**
     * Log quando un utente fa signin
     */
    async signIn({ user, isNewUser }: { user: any; isNewUser?: boolean }) {
      console.log(`✅ Sign in: ${user.email} (${isNewUser ? 'nuovo' : 'returning'})`);
    },

    /**
     * Log quando un utente fa signout
     */
    async signOut(message: any) {
      console.log(`👋 Sign out: ${message?.token?.email ?? 'unknown'}`);
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
});
