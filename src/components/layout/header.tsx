'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Sidebar } from '@/components/layout/sidebar'
import { useState } from 'react'

interface HeaderProps {
  userEmail?: string | null
  userName?: string | null
  pageTitle?: string
}

export function Header({ userEmail, userName, pageTitle }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
      {/* Mobile menu trigger */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar userEmail={userEmail} userName={userName} />
        </SheetContent>
      </Sheet>

      {/* Page title */}
      {pageTitle && (
        <h1 className="text-lg font-semibold">{pageTitle}</h1>
      )}
    </header>
  )
}
