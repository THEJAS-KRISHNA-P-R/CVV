'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface ChatUser {
    id: string
    full_name: string | null
    avatar_url: string | null
}

interface ChatPreview {
    userId: string
    user: ChatUser | null
    lastMessage: string
    lastMessageAt: string
    unreadCount: number
}

interface ChatListProps {
    currentUserId: string
    selectedUserId: string | null
    onSelectUser: (userId: string) => void
}

export function ChatList({ currentUserId, selectedUserId, onSelectUser }: ChatListProps) {
    const [chats, setChats] = useState<ChatPreview[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        if (!currentUserId) return

        fetchConversations()

        // Subscribe to new messages to update the list
        const channel = supabase
            .channel(`chat_list:${currentUserId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chats',
                    filter: `receiver_id=eq.${currentUserId}`,
                },
                () => {
                    fetchConversations()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chats',
                    filter: `sender_id=eq.${currentUserId}`,
                },
                () => {
                    fetchConversations()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [currentUserId])

    async function fetchConversations() {
        try {
            // Fetch all messages involving the current user
            const { data: messages, error } = await supabase
                .from('chats')
                .select('*')
                .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
                .order('created_at', { ascending: false })

            if (error) throw error

            const conversationMap = new Map<string, ChatPreview>()

            for (const msg of messages) {
                const otherUserId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id

                if (!conversationMap.has(otherUserId)) {
                    conversationMap.set(otherUserId, {
                        userId: otherUserId,
                        user: null, // To be fetched
                        lastMessage: msg.message,
                        lastMessageAt: msg.created_at,
                        unreadCount: 0
                    })
                }

                const convo = conversationMap.get(otherUserId)!

                // Count unread messages received by current user
                if (msg.receiver_id === currentUserId && !msg.is_read) {
                    // We might need a better way to count this properly per conversation
                    // But for now, since we iterate desc, we can't sum easily without iterating all.
                    // Let's just fix unread count logic: filtering matches
                }
            }

            // Calculate unread counts correctly
            conversationMap.forEach((convo, otherUserId) => {
                const unread = messages.filter(m =>
                    m.sender_id === otherUserId &&
                    m.receiver_id === currentUserId &&
                    !m.is_read
                ).length
                convo.unreadCount = unread
            })


            // Fetch profiles for these users
            const userIds = Array.from(conversationMap.keys())
            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name') // avatar_url might be in a different table or logic, schema says profiles doesn't have avatar_url column in CREATE TABLE statement 00001, wait..
                    // 00001_initial_schema.sql: 
                    // CREATE TABLE IF NOT EXISTS profiles ( ... id, role, full_name, phone, preferred_language, green_credits ... )
                    // It DOES NOT have avatar_url. 
                    // But top-navbar.tsx uses avatar_url. 
                    // Ah, top-navbar.tsx: setUser({ ...(profile as Omit<UserProfile, 'avatar_url'>), avatar_url: null })
                    // So avatar_url is mocked or NULL. I'll stick to full_name.
                    .in('id', userIds)

                if (profiles) {
                    profiles.forEach(p => {
                        if (conversationMap.has(p.id)) {
                            conversationMap.get(p.id)!.user = { ...p, avatar_url: null }
                        }
                    })
                }
            }

            setChats(Array.from(conversationMap.values()))
        } catch (error) {
            console.error('Error fetching conversations:', error)
        } finally {
            setLoading(false)
        }
    }

    const getInitials = (name: string | null) => {
        if (!name) return 'U'
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    if (loading) return <div className="p-4 text-center text-sm text-muted-foreground">Loading chats...</div>

    if (chats.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <p>No conversations yet.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-2">
            {chats.map((chat) => (
                <div
                    key={chat.userId}
                    onClick={() => onSelectUser(chat.userId)}
                    className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                        selectedUserId === chat.userId ? "bg-muted" : "bg-card"
                    )}
                >
                    <Avatar>
                        <AvatarImage src={chat.user?.avatar_url || undefined} />
                        <AvatarFallback>{getInitials(chat.user?.full_name || 'User')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-baseline">
                            <h4 className="font-medium truncate">{chat.user?.full_name || 'User'}</h4>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                {formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: false })}
                            </span>
                        </div>
                        <p className={cn(
                            "text-sm truncate",
                            chat.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground"
                        )}>
                            {chat.lastMessage}
                        </p>
                    </div>
                    {chat.unreadCount > 0 && (
                        <div className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {chat.unreadCount}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
