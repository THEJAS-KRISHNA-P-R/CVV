'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShoppingCart, Plus, Search } from 'lucide-react'

export default function MarketplacePage() {
  return (
    <div className="space-y-6 p-4 md:p-8 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Circular Marketplace</h1>
          <p className="text-muted-foreground mt-2">
            Trade surplus building materials with neighbors
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              className="pl-10"
            />
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            List Item
          </Button>
        </div>

        {/* Marketplace Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Sample Product Cards - Placeholder */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold">Item {i}</h3>
                <p className="text-sm text-muted-foreground">Ward {Math.floor(Math.random() * 20) + 1}</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Chat
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
    </div>
  )
}
