'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChatList } from '@/components/chat/chat-list'
import { ChatWindow } from '@/components/chat/chat-window'
import { Card } from '@/components/ui/card'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

import { Suspense } from 'react'

function ChatContent() {
  const params = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [initialItemId, setInitialItemId] = useState<string | null>(null)

  // Mobile view state
  const [showChatWindow, setShowChatWindow] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
      else router.push('/login')
    })
  }, [router, supabase])

  useEffect(() => {
    const userIdParam = params.get('userId')
    const itemIdParam = params.get('itemId')

    if (userIdParam) {
      setSelectedUserId(userIdParam)
      setShowChatWindow(true)
    }

    if (itemIdParam) {
      setInitialItemId(itemIdParam)
    }
  }, [params])

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId)
    setShowChatWindow(true)
    // Update URL without refresh
    router.replace(`/chat?userId=${userId}${initialItemId ? `&itemId=${initialItemId}` : ''}`)
  }

  const handleBackToList = () => {
    setShowChatWindow(false)
    setSelectedUserId(null)
    setInitialItemId(null)
    router.replace('/chat')
  }

  if (!currentUserId) return null

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-8 h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        {/* Chat List - Hidden on mobile if chat window is open */}
        <Card className={`col-span-1 p-4 flex flex-col h-full ${showChatWindow ? 'hidden md:flex' : 'flex'}`}>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Messages
          </h2>
          <div className="flex-1 overflow-y-auto">
            <ChatList
              currentUserId={currentUserId}
              selectedUserId={selectedUserId}
              onSelectUser={handleSelectUser}
            />
          </div>
        </Card>

        {/* Chat Window - Hidden on mobile if no user selected */}
        <div className={`col-span-1 md:col-span-2 h-full ${showChatWindow ? 'flex' : 'hidden md:flex'}`}>
          {selectedUserId ? (
            <div className="w-full h-full flex flex-col">
              <Button
                variant="ghost"
                className="md:hidden w-fit mb-2 -ml-2 gap-1 text-muted-foreground"
                onClick={handleBackToList}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Inbox
              </Button>
              <ChatWindow
                currentUserId={currentUserId}
                otherUserId={selectedUserId}
                initialItemId={initialItemId || undefined}
              />
            </div>
          ) : (
            <Card className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-8">
              <MessageCircle className="w-16 h-16 opacity-10 mb-4" />
              <h3 className="text-xl font-medium">Select a conversation</h3>
              <p>Choose a chat from the left or start a new one from the Marketplace.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading chat...</div>}>
      <ChatContent />
    </Suspense>
  )
}
