export interface MarketplaceItem {
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
    is_available: boolean
}
