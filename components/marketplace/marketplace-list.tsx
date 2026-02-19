'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingCart, MessageCircle, MapPin, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface MarketplaceItem {
    id: string
    title: string
    description: string
    category: string
    quantity: string
    price: number
    is_free: boolean
    fuzzy_location: string
    created_at: string
    user_id: string
    images: string[]
}

export function MarketplaceList() {
    const [items, setItems] = useState<MarketplaceItem[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        fetchItems()

        // Realtime subscription
        const channel = supabase
            .channel('marketplace_items_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'marketplace_items',
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setItems((prev) => [payload.new as MarketplaceItem, ...prev])
                    } else if (payload.eventType === 'DELETE') {
                        setItems((prev) => prev.filter((item) => item.id !== payload.old.id))
                    } else if (payload.eventType === 'UPDATE') {
                        setItems((prev) => prev.map((item) => item.id === payload.new.id ? payload.new as MarketplaceItem : item))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    async function fetchItems() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('marketplace_items')
                .select('*')
                .eq('is_available', true)
                .order('created_at', { ascending: false })

            if (error) throw error
            setItems(data || [])
        } catch (error) {
            console.error('Error fetching marketplace items:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredItems = items.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
        return matchesSearch && matchesCategory
    })

    const handleChat = (sellerId: string, itemId: string) => {
        // Navigate to chat with pre-filled context
        // We'll initiate the chat in the Chat page logic
        router.push(`/chat?userId=${sellerId}&itemId=${itemId}`)
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search items..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="cement">Cement</SelectItem>
                        <SelectItem value="bricks">Bricks</SelectItem>
                        <SelectItem value="tiles">Tiles</SelectItem>
                        <SelectItem value="wood">Wood</SelectItem>
                        <SelectItem value="metal">Metal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="text-center py-10">Loading marketplace...</div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                    <ShoppingCart className="w-12 h-12 mx-auto opacity-20 mb-4" />
                    <h3 className="text-lg font-medium">No items found</h3>
                    <p>Be the first to list something!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredItems.map((item) => (
                        <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow bg-card">
                            <div className="aspect-video bg-muted flex items-center justify-center relative">
                                {item.images && item.images.length > 0 ? (
                                    /* Ideally use Next.js Image with Supabase Storage URL */
                                    <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${item.images[0]})` }} />
                                ) : (
                                    <ShoppingCart className="w-12 h-12 text-muted-foreground/30" />
                                )}
                                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                </div>
                            </div>
                            <div className="p-4 space-y-3">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-lg line-clamp-1">{item.title}</h3>
                                        <span className="font-bold text-primary whitespace-nowrap">
                                            {item.price > 0 ? `₹${item.price}` : 'Free'}
                                        </span>
                                    </div>
                                    <div className="flex items-center text-xs text-muted-foreground mt-1 gap-2">
                                        <span className="capitalize bg-secondary px-1.5 py-0.5 rounded">{item.category}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {item.fuzzy_location || 'Local'}
                                        </span>
                                    </div>
                                </div>

                                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                                    {item.description || "No description provided."}
                                </p>

                                <div className="pt-2 flex gap-2">
                                    {/* We might want to disable this if it's the user's own item, handled better with auth context */}
                                    <Button
                                        className="flex-1 gap-2"
                                        onClick={() => handleChat(item.user_id, item.id)}
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        Chat
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
