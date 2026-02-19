'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, LogOut, Settings, Leaf, Zap, BarChart3 } from 'lucide-react'

export default function ProfilePage() {
  return (
    <div className="space-y-6 p-4 md:p-8 max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">John Doe</h1>
            <p className="text-muted-foreground">Member since Jan 2024</p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Leaf className="w-5 h-5 text-green-600" />
                Total Waste Collected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">124 kg</p>
              <p className="text-sm text-muted-foreground mt-2">
                This month: 24 kg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="w-5 h-5 text-yellow-600" />
                Green Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">245</p>
              <p className="text-sm text-muted-foreground mt-2">
                Available to spend
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Items Listed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">3</p>
              <p className="text-sm text-muted-foreground mt-2">
                On marketplace
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Manage your account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-muted-foreground">john.doe@example.com</p>
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <p className="text-muted-foreground">+91 98765 43210</p>
            </div>
            <div>
              <label className="text-sm font-medium">Ward Number</label>
              <p className="text-muted-foreground">Ward 5</p>
            </div>
            <Button variant="outline" className="w-full gap-2">
              <Settings className="w-4 h-4" />
              Edit Profile
            </Button>
          </CardContent>
        </Card>

        {/* Household Information */}
        <Card>
          <CardHeader>
            <CardTitle>Household Information</CardTitle>
            <CardDescription>
              Your registered household details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">QR Code</label>
              <p className="text-muted-foreground text-sm">HH-2024-00145</p>
            </div>
            <div>
              <label className="text-sm font-medium">Members</label>
              <p className="text-muted-foreground">4 members</p>
            </div>
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Settings className="w-4 h-4 mr-2" />
              Change Password
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Settings className="w-4 h-4 mr-2" />
              Notification Preferences
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Settings className="w-4 h-4 mr-2" />
              Privacy & Security
            </Button>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button variant="destructive" className="w-full gap-2" size="lg">
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
    </div>
  )
}
