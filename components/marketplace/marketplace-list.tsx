'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingCart, MessageCircle, MapPin, Search, MoreVertical, Pencil, Trash2, Tag } from 'lucide-react'
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from 'sonner'
import { MarketplaceItem } from '@/types/marketplace'
import { MarketplaceItemDialog } from './create-item-dialog'


export function MarketplaceList() {
    const [items, setItems] = useState<MarketplaceItem[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')

    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [editingItem, setEditingItem] = useState<MarketplaceItem | null>(null)
    const [editDialogOpen, setEditDialogOpen] = useState(false)

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        fetchUser()
        fetchItems()

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
                        setItems((prev) => {
                            // If marked unavailable (sold/deleted logic), remove from list
                            if (payload.new.is_available === false) {
                                return prev.filter(item => item.id !== payload.new.id)
                            }
                            return prev.map((item) => item.id === payload.new.id ? payload.new as MarketplaceItem : item)
                        })
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    async function fetchUser() {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            setCurrentUserId(user.id)
        }
    }

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
        router.push(`/chat?userId=${sellerId}&itemId=${itemId}`)
    }

    const handleDelete = async (itemId: string) => {
        if (!confirm('Are you sure you want to delete this listing?')) return
        try {
            const { error } = await supabase
                .from('marketplace_items')
                .delete() // Actually deleting for now, or could set is_available=false
                .eq('id', itemId)

            if (error) throw error
            toast.success('Listing deleted')
            // Realtime will update UI, but fallback:
            setItems(prev => prev.filter(i => i.id !== itemId))
        } catch (error) {
            console.error('Error deleting item', error)
            toast.error('Failed to delete listing')
        }
    }

    const handleMarkSold = async (itemId: string) => {
        try {
            const { error } = await supabase
                .from('marketplace_items')
                .update({ is_available: false })
                .eq('id', itemId)

            if (error) throw error
            toast.success('Marked as sold')
            setItems(prev => prev.filter(i => i.id !== itemId))
        } catch (error) {
            console.error('Error updating item', error)
            toast.error('Failed to update listing')
        }
    }

    return (
        <div className="space-y-6">
            <MarketplaceItemDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                itemToEdit={editingItem || undefined}
                onSuccess={() => {
                    setEditingItem(null)
                    setEditDialogOpen(false)
                    fetchItems() // Refresh to be safe
                }}
            />

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
                        <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow bg-card flex flex-col">
                            <div className="aspect-video bg-muted flex items-center justify-center relative">
                                {item.images && item.images.length > 0 ? (
                                    <div
                                        className="w-full h-full bg-cover bg-center transition-transform hover:scale-105 duration-300"
                                        style={{ backgroundImage: `url(${item.images[0]})` }}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                                        <ShoppingCart className="w-12 h-12 mb-2" />
                                        <span className="text-xs">No Image</span>
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                </div>

                                {currentUserId === item.user_id && (
                                    <div className="absolute top-2 left-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="secondary" size="icon" className="h-6 w-6 rounded-full bg-black/60 text-white hover:bg-black/80">
                                                    <MoreVertical className="h-3 w-3" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start">
                                                <DropdownMenuItem onClick={() => {
                                                    setEditingItem(item)
                                                    setEditDialogOpen(true)
                                                }}>
                                                    <Pencil className="w-4 h-4 mr-2" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleMarkSold(item.id)}>
                                                    <Tag className="w-4 h-4 mr-2" /> Mark as Sold
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-destructive">
                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 space-y-3 flex-1 flex flex-col">
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

                                <div className="pt-2 flex gap-2 mt-auto">
                                    {currentUserId !== item.user_id ? (
                                        <Button
                                            className="flex-1 gap-2"
                                            onClick={() => handleChat(item.user_id, item.id)}
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            Chat
                                        </Button>
                                    ) : (
                                        <Button variant="outline" className="flex-1 cursor-default opacity-50">
                                            Your Listing
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
