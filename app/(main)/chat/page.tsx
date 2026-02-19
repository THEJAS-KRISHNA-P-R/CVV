'use client'

import { Card } from '@/components/ui/card'
import { MessageCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ChatPage() {
  return (
    <div className="space-y-6 p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Messages</h1>
            <p className="text-muted-foreground mt-2">
              Chat with sellers and buyers in the marketplace
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        {/* Conversations List */}
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="p-4 hover:bg-muted cursor-pointer transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">User {i}</h3>
                  <p className="text-sm text-muted-foreground">Last message text here...</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">2:30 PM</p>
                  <span className="inline-block mt-1 w-2 h-2 rounded-full bg-primary"></span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty State Hint */}
        <div className="text-center py-8 text-muted-foreground">
          <MessageCircle className="w-12 h-12 mx-auto opacity-20 mb-2" />
          <p>Select a conversation to start chatting</p>
        </div>
    </div>
  )
}
