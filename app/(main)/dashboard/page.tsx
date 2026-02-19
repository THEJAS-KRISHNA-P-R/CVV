'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Zap, Leaf, BarChart3, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardData {
  name: string
  greenCredits: number
  nextCollection: string
  wasteReady: boolean
  itemsInMarketplace: number
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    name: 'User',
    greenCredits: 245,
    nextCollection: '2025-02-22',
    wasteReady: false,
    itemsInMarketplace: 3,
  })
  const [loading, setLoading] = useState(false)

  const toggleWasteReady = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))
      setData((prev) => ({
        ...prev,
        wasteReady: !prev.wasteReady,
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
      <div className="space-y-6 p-4 md:p-8 max-w-6xl mx-auto">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {data.name}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Your household waste management dashboard
          </p>
        </div>

        {/* Waste Ready Toggle - Featured Card */}
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Zap className="w-6 h-6" />
              Waste Ready Status
            </CardTitle>
            <CardDescription>
              Tell us when your waste is ready for collection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">
                  Current Status:
                </p>
                <p className={cn(
                  'text-2xl font-bold',
                  data.wasteReady ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                )}>
                  {data.wasteReady ? '✓ Ready for Collection' : '○ Not Ready'}
                </p>
              </div>
              <Button
                onClick={toggleWasteReady}
                disabled={loading}
                size="lg"
                className={cn(
                  'md:w-auto',
                  data.wasteReady
                    ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse'
                    : 'bg-primary hover:bg-primary/90'
                )}
              >
                {loading ? 'Updating...' : data.wasteReady ? 'Mark as Collected' : 'Mark as Ready'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Green Credits Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Leaf className="w-5 h-5 text-green-600" />
                Green Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{data.greenCredits}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Earned from waste segregation
              </p>
            </CardContent>
          </Card>

          {/* Next Collection Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Next Collection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {new Date(data.nextCollection).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Saturday Morning
              </p>
            </CardContent>
          </Card>

          {/* Marketplace Listings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-amber-600" />
                Active Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{data.itemsInMarketplace}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Items on marketplace
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" className="h-auto flex-col py-4">
                <Zap className="w-5 h-5 mb-2" />
                <span className="text-xs">Segregate Waste</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col py-4">
                <BarChart3 className="w-5 h-5 mb-2" />
                <span className="text-xs">List Item</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col py-4">
                <AlertCircle className="w-5 h-5 mb-2" />
                <span className="text-xs">Report Issue</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col py-4">
                <Leaf className="w-5 h-5 mb-2" />
                <span className="text-xs">View History</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Did you know?
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Proper waste segregation helps us recover resources efficiently and earn more green credits!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
