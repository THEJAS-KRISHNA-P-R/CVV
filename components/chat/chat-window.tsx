'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, MoreVertical, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface ChatWindowProps {
    currentUserId: string
    otherUserId: string
    initialItemId?: string | null
}

interface Message {
    id: string
    sender_id: string
    receiver_id: string
    message: string
    created_at: string
    is_read: boolean
    marketplace_item_id?: string
}

interface UserProfile {
    id: string
    full_name: string | null
}

export function ChatWindow({ currentUserId, otherUserId, initialItemId }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [otherUser, setOtherUser] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [productContext, setProductContext] = useState<{ title: string; price: number } | null>(null)

    const scrollRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    useEffect(() => {
        fetchMessages()
        fetchUserProfile()

        if (initialItemId) {
            fetchProductDetails(initialItemId)
        }

        // Mark messages as read
        markAsRead()

        // Realtime subscription
        console.log(`Subscribing to chat updates for user ${currentUserId} with ${otherUserId}`)
        const channel = supabase
            .channel(`chat_debug:${currentUserId}`) // Use a unique channel for debugging
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chats',
                    // removing server-side filter to debug connectivity - receiving ALL chats
                },
                (payload) => {
                    console.log('Realtime payload received:', payload)
                    const newMsg = payload.new as Message

                    // Debug logs
                    console.log('New ID:', newMsg.id)
                    console.log('Sender:', newMsg.sender_id)
                    console.log('Receiver:', newMsg.receiver_id)
                    console.log('Expected Receiver:', currentUserId)
                    console.log('Expected Sender:', otherUserId)

                    // Filter client-side
                    // 1. Incoming message: Sender is Other, Receiver is Me
                    // 2. Outgoing message (sync): Sender is Me, Receiver is Other (e.g. from another tab/device)
                    const isRelevant =
                        (newMsg.sender_id === otherUserId && newMsg.receiver_id === currentUserId) ||
                        (newMsg.sender_id === currentUserId && newMsg.receiver_id === otherUserId)

                    if (isRelevant) {
                        console.log('Message is relevant, adding to state.')
                        setMessages((prev) => {
                            // Deduplicate
                            if (prev.some((m) => m.id === newMsg.id)) return prev
                            return [...prev, newMsg]
                        })

                        // If we just received a message, mark it as read immediately
                        if (newMsg.receiver_id === currentUserId) {
                            markAsRead()
                        }
                    } else {
                        console.log('Message is NOT relevant to this conversation.')
                    }
                }
            )
            .subscribe((status) => {
                console.log('Supabase Realtime Status:', status)
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [currentUserId, otherUserId, initialItemId])

    useEffect(() => {
        // Scroll to bottom on new message
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    async function fetchMessages() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('chats')
                .select('*')
                .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
                .order('created_at', { ascending: true })

            if (error) throw error
            setMessages(data || [])
        } catch (error) {
            console.error('Error fetching messages:', error)
        } finally {
            setLoading(false)
        }
    }

    async function fetchUserProfile() {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('id', otherUserId)
            .single()

        if (data) setOtherUser(data)
    }

    async function fetchProductDetails(itemId: string) {
        const { data } = await supabase
            .from('marketplace_items')
            .select('title, price')
            .eq('id', itemId)
            .single()

        if (data) setProductContext(data)
    }

    async function markAsRead() {
        // Only mark messages as read if we are the receiver
        await supabase
            .from('chats')
            .update({ is_read: true })
            .eq('sender_id', otherUserId)
            .eq('receiver_id', currentUserId)
            .eq('is_read', false)
    }

    async function handleSendMessage(e: React.FormEvent) {
        e.preventDefault()
        if (!newMessage.trim()) return

        const msgText = newMessage.trim()
        setNewMessage('')

        // Optimistic update
        const optimisticMsg: Message = {
            id: 'temp-' + Date.now(),
            sender_id: currentUserId,
            receiver_id: otherUserId,
            message: msgText,
            created_at: new Date().toISOString(),
            is_read: false,
            marketplace_item_id: initialItemId || undefined,
        }
        setMessages((prev) => [...prev, optimisticMsg])

        try {
            const { data, error } = await supabase
                .from('chats')
                .insert({
                    sender_id: currentUserId,
                    receiver_id: otherUserId,
                    message: msgText,
                    marketplace_item_id: initialItemId || null,
                })
                .select()
                .single()

            if (error) throw error

            // Replace optimistic message
            setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? data : m)))
        } catch (error) {
            console.error('Error sending message:', error)
            // Rollback
            setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
            setNewMessage(msgText) // Restore text
        }
    }

    const getInitials = (name: string | null) => {
        if (!name) return 'U'
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    if (loading) return <div className="h-full flex items-center justify-center">Loading chat...</div>

    return (
        <div className="flex flex-col h-full border rounded-lg bg-background shadow-sm">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-muted/40">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarFallback>{getInitials(otherUser?.full_name || 'User')}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="font-semibold">{otherUser?.full_name || 'User'}</h3>
                        {productContext && (
                            <div className="text-xs flex items-center gap-1 text-muted-foreground">
                                <ShoppingBag className="w-3 h-3" />
                                Asking about: {productContext.title}
                            </div>
                        )}
                    </div>
                </div>
                <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
                <div className="flex flex-col gap-3">
                    {messages.map((msg) => {
                        const isMe = msg.sender_id === currentUserId
                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    'flex flex-col max-w-[80%]',
                                    isMe ? 'self-end items-end' : 'self-start items-start'
                                )}
                            >
                                <div
                                    className={cn(
                                        'px-4 py-2 rounded-lg text-sm',
                                        isMe
                                            ? 'bg-primary text-primary-foreground rounded-br-none'
                                            : 'bg-muted text-foreground rounded-bl-none'
                                    )}
                                >
                                    {msg.message}
                                </div>
                                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                    {format(new Date(msg.created_at), 'h:mm a')}
                                </span>
                            </div>
                        )
                    })}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                </Button>
            </form>
        </div>
    )
}
