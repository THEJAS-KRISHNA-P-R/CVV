'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Leaf, MapPin, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type RegistrationStep = 'basic' | 'location' | 'qr' | 'review'

interface FormData {
  name: string
  email: string
  password: string
  phone: string
  ward: string
  qrCode: string
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<RegistrationStep>('basic')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    phone: '',
    ward: '',
    qrCode: '',
  })

  const steps: { id: RegistrationStep; label: string; icon: React.ReactNode }[] = [
    { id: 'basic', label: 'Basic Info', icon: <Leaf className="w-4 h-4" /> },
    { id: 'qr', label: 'Scan QR', icon: <QrCode className="w-4 h-4" /> },
    { id: 'location', label: 'Location', icon: <MapPin className="w-4 h-4" /> },
    { id: 'review', label: 'Review', icon: null },
  ]

  const handleNext = async () => {
    setError('')

    // Validate current step
    if (step === 'basic') {
      if (!formData.name || !formData.email || !formData.password || !formData.phone) {
        setError('Please fill in all required fields')
        return
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
      setStep('qr')
    } else if (step === 'qr') {
      setStep('location')
    } else if (step === 'location') {
      if (!formData.ward) {
        setError('Please select a ward')
        return
      }
      setStep('review')
    } else if (step === 'review') {
      await handleRegister()
    }
  }

  const handleRegister = async () => {
    setLoading(true)
    setError('')

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            phone: formData.phone,
            ward: formData.ward, // Metadata
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Registration failed. Please try again.')

      // 2. Create Profile entry (if not handled by trigger)
      // Note: Assuming a trigger handles profile creation from auth.users, 
      // but if not, we should insert into 'profiles' table here.
      // Checking local schema knowledge: 00001_initial_schema.sql usually has a trigger.
      // If not, we insert manually. Let's try to insert manually to be safe or explicit updates.

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.name,
          phone: formData.phone,
          // ward might go to households table or specific column
        })
        .eq('id', authData.user.id)

      // If update fails (e.g. row doesn't exist efficiently), we might need to insert. 
      // But typically handle_new_user trigger exists.

      // Update Household linkage if QR code provided
      if (formData.qrCode) {
        // This logic depends on backend implementation of linking QR to household
      }

      toast.success('Registration successful!', {
        description: 'Welcome to Nirman.',
      })

      router.push('/dashboard')
    } catch (err) {
      console.error('Registration error:', err)
      const message = err instanceof Error ? err.message : 'Registration failed'
      setError(message)
      toast.error('Registration failed', {
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Leaf className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Nirman</h1>
          </div>
          <p className="text-muted-foreground">Join the waste management revolution</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8 flex gap-2">
          {steps.map((s) => (
            <div key={s.id} className="flex-1">
              <div
                className={cn(
                  'h-1 rounded-full transition-colors',
                  ['basic', 'qr', 'location', 'review'].indexOf(step) >=
                    steps.indexOf(s)
                    ? 'bg-primary'
                    : 'bg-muted'
                )}
              />
            </div>
          ))}
        </div>

        {/* Registration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>
              Step {['basic', 'qr', 'location', 'review'].indexOf(step) + 1} of{' '}
              {steps.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Basic Information Step */}
            {step === 'basic' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            {/* QR Code Step */}
            {step === 'qr' && (
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-8 text-center">
                  <QrCode className="w-16 h-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Point your camera at your house QR code
                  </p>
                  <Button variant="outline" className="w-full">
                    Start Camera
                  </Button>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-muted" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-background text-muted-foreground">
                      or enter manually
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qr">QR Code</Label>
                  <Input
                    id="qr"
                    placeholder="HH-2024-00145"
                    value={formData.qrCode}
                    onChange={(e) =>
                      setFormData({ ...formData, qrCode: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            {/* Location Step */}
            {step === 'location' && (
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-8 text-center">
                  <MapPin className="w-16 h-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Select your ward/location
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ward">Ward Number</Label>
                  <Input
                    id="ward"
                    placeholder="e.g., Ward 5"
                    value={formData.ward}
                    onChange={(e) =>
                      setFormData({ ...formData, ward: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            {/* Review Step */}
            {step === 'review' && (
              <div className="space-y-4">
                <div className="space-y-3 bg-muted p-4 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium">{formData.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{formData.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{formData.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ward</p>
                    <p className="font-medium">{formData.ward}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-2 pt-4">
              {step !== 'basic' && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const currentIndex = ['basic', 'qr', 'location', 'review'].indexOf(step)
                    setStep(['basic', 'qr', 'location', 'review'][currentIndex - 1] as RegistrationStep)
                  }}
                  disabled={loading}
                >
                  Back
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={handleNext}
                disabled={loading}
              >
                {loading
                  ? 'Processing...'
                  : step === 'review'
                    ? 'Create Account'
                    : 'Next'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Already have an account?
          </p>
          <Link href="/login">
            <Button variant="link" className="text-primary">
              Sign In Instead
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
