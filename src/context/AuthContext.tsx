import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Profile, UserRole } from '../types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  role: UserRole
  isAdmin: boolean
  isLoading: boolean
  isLiveConfigured: boolean
  login: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>
  register: (data: {
    email: string
    password: string
    fullName: string
    phone: string
    address: string
  }) => Promise<{ error: AuthError | Error | null }>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>
  setDemoRole?: (role: UserRole) => void // Only for preview/demo when live Supabase is offline
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const LOCAL_STORAGE_USER_KEY = 'calls_kitchen_local_user'
const LOCAL_STORAGE_ROLE_KEY = 'calls_kitchen_local_role'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState<UserRole>('customer')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const isLive = isSupabaseConfigured()

  // Fetch role and profile from Supabase securely
  const fetchUserProfileAndRole = async (userId: string, email?: string) => {
    try {
      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileData) {
        setProfile(profileData)
      } else if (!profileError || profileError.code === 'PGRST116') {
        // Fallback default profile if not yet created
        setProfile({
          id: userId,
          full_name: email?.split('@')[0] || 'Pelanggan Calls Kitchen',
          phone: '',
          address: '',
        })
      }

      // 2. Fetch Role securely from user_roles table
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)

      if (roleData && roleData.some((r) => r.role === 'admin')) {
        setRole('admin')
      } else {
        setRole('customer')
      }
    } catch (err) {
      console.error('Error fetching user profile and role:', err)
      setRole('customer')
    }
  }

  // Initialize Auth state
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      setIsLoading(true)

      if (isLive) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user && mounted) {
            setUser(session.user)
            await fetchUserProfileAndRole(session.user.id, session.user.email)
          }
        } catch (err) {
          console.warn('Failed to retrieve Supabase session:', err)
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            if (!mounted) return
            if (session?.user) {
              setUser(session.user)
              setTimeout(async () => {
                if (mounted) {
                  await fetchUserProfileAndRole(session.user.id, session.user.email)
                  setIsLoading(false)
                }
              }, 0)
            } else {
              setUser(null)
              setProfile(null)
              setRole('customer')
              setIsLoading(false)
            }
          }
        )

        setIsLoading(false)
        return () => {
          subscription.unsubscribe()
        }
      } else {
        // Local preview fallback mode when live Supabase anon key is not set
        try {
          const savedUser = localStorage.getItem(LOCAL_STORAGE_USER_KEY)
          const savedRole = (localStorage.getItem(LOCAL_STORAGE_ROLE_KEY) as UserRole) || 'customer'
          if (savedUser) {
            const parsed = JSON.parse(savedUser)
            setUser(parsed.user)
            setProfile(parsed.profile)
            setRole(savedRole)
          }
        } catch {
          // Ignore json parse error
        }
        setIsLoading(false)
      }
    }

    initializeAuth()

    return () => {
      mounted = false
    }
  }, [isLive])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    if (isLive) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          setIsLoading(false)
          return { error }
        }
        if (data.user) {
          setUser(data.user)
          await fetchUserProfileAndRole(data.user.id, data.user.email)
        }
        setIsLoading(false)
        return { error: null }
      } catch (err) {
        setIsLoading(false)
        return { error: err as Error }
      }
    } else {
      // Local fallback mode
      await new Promise(r => setTimeout(r, 600))
      // Check if trying to login as admin demo
      const isDemoAdmin = email.toLowerCase().includes('admin')
      const assignedRole: UserRole = isDemoAdmin ? 'admin' : 'customer'
      
      const mockUser: User = {
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        app_metadata: {},
        user_metadata: { full_name: email.split('@')[0] },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email,
      } as User

      const mockProfile: Profile = {
        id: mockUser.id,
        full_name: email.split('@')[0],
        phone: '08123456789',
        address: 'Jl. Merdeka No. 45, Jakarta',
      }

      setUser(mockUser)
      setProfile(mockProfile)
      setRole(assignedRole)

      localStorage.setItem(
        LOCAL_STORAGE_USER_KEY,
        JSON.stringify({ user: mockUser, profile: mockProfile })
      )
      localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, assignedRole)

      setIsLoading(false)
      return { error: null }
    }
  }

  const register = async ({
    email,
    password,
    fullName,
    phone,
    address,
  }: {
    email: string
    password: string
    fullName: string
    phone: string
    address: string
  }) => {
    setIsLoading(true)
    if (isLive) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone,
              address,
            },
          },
        })
        if (error) {
          setIsLoading(false)
          return { error }
        }

        if (data.user) {
          // Upsert profile in DB
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            phone,
            address,
            updated_at: new Date().toISOString(),
          })
          
          setUser(data.user)
          await fetchUserProfileAndRole(data.user.id, data.user.email)
        }

        setIsLoading(false)
        return { error: null }
      } catch (err) {
        setIsLoading(false)
        return { error: err as Error }
      }
    } else {
      // Local fallback mode
      await new Promise(r => setTimeout(r, 700))
      const mockUser: User = {
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        app_metadata: {},
        user_metadata: { full_name: fullName },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email,
      } as User

      const mockProfile: Profile = {
        id: mockUser.id,
        full_name: fullName,
        phone,
        address,
      }

      setUser(mockUser)
      setProfile(mockProfile)
      setRole('customer')

      localStorage.setItem(
        LOCAL_STORAGE_USER_KEY,
        JSON.stringify({ user: mockUser, profile: mockProfile })
      )
      localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, 'customer')

      setIsLoading(false)
      return { error: null }
    }
  }

  const logout = async () => {
    setIsLoading(true)
    if (isLive) {
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.error('Logout error:', err)
      }
    }
    setUser(null)
    setProfile(null)
    setRole('customer')
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY)
    localStorage.removeItem(LOCAL_STORAGE_ROLE_KEY)
    setIsLoading(false)
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('User tidak terautentikasi') }
    
    const newProfile = { ...profile, ...updates, id: user.id } as Profile
    setProfile(newProfile)

    if (isLive) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
        if (error) return { error }
      } catch (err) {
        return { error: err as Error }
      }
    } else {
      localStorage.setItem(
        LOCAL_STORAGE_USER_KEY,
        JSON.stringify({ user, profile: newProfile })
      )
    }

    return { error: null }
  }

  const setDemoRole = (newRole: UserRole) => {
    if (!isLive) {
      setRole(newRole)
      localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, newRole)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAdmin: role === 'admin',
        isLoading,
        isLiveConfigured: isLive,
        login,
        register,
        logout,
        updateProfile,
        setDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
