'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Loader2, ImagePlus } from 'lucide-react'

const itemSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional(),
    category: z.enum(['cement', 'rebars', 'bricks', 'tiles', 'sand', 'gravel', 'wood', 'metal', 'other']),
    quantity: z.string().min(1, 'Quantity is required'),
    price: z.coerce.number().min(0, 'Price must be non-negative'),
    location: z.string().optional(), // For simplicity, we'll use fuzzy location or user's address later
})

type ItemFormValues = z.infer<typeof itemSchema>

export function CreateItemDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const supabase = createClient()

    const form = useForm<ItemFormValues>({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            title: '',
            description: '',
            category: 'other',
            quantity: '',
            price: 0,
            location: '',
        },
    })

    async function onSubmit(data: ItemFormValues) {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                toast.error('You must be logged in to post an item')
                return
            }

            // Check if profile exists and get household info ideally, but here we just insert

            const { error } = await supabase
                .from('marketplace_items')
                .insert({
                    user_id: user.id,
                    title: data.title,
                    description: data.description,
                    category: data.category,
                    quantity: data.quantity,
                    price: data.price,
                    // We can add location logic later
                    fuzzy_location: data.location || 'Your Area',
                    is_available: true,
                })

            if (error) throw error

            toast.success('Item listed successfully!')
            setOpen(false)
            form.reset()
        } catch (error) {
            console.error('Error creating item:', error)
            toast.error('Failed to create listing')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    List Item
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>List an Item</DialogTitle>
                    <DialogDescription>
                        Share surplus materials with your community.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. 50 Bricks" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a category" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="cement">Cement</SelectItem>
                                            <SelectItem value="bricks">Bricks</SelectItem>
                                            <SelectItem value="tiles">Tiles</SelectItem>
                                            <SelectItem value="wood">Wood</SelectItem>
                                            <SelectItem value="metal">Metal</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantity</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. 10 kg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Price (₹)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="0 for Free" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Add details about condition, pickup instructions..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Post Listing
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
