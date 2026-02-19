'use client'

import { MarketplaceList } from '@/components/marketplace/marketplace-list'
import { CreateItemDialog } from '@/components/marketplace/create-item-dialog'

export default function MarketplacePage() {
  return (
    <div className="space-y-6 p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Circular Marketplace</h1>
          <p className="text-muted-foreground mt-2">
            Trade surplus building materials with neighbors
          </p>
        </div>
        <CreateItemDialog />
      </div>

      <MarketplaceList />
    </div>
  )
}
