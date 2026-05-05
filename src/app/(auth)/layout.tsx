import { Linkedin } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-10 text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/10">
            <Linkedin className="h-4 w-4" />
          </div>
          <span className="font-semibold">LinkedIn Content Studio</span>
        </div>

        <blockquote className="space-y-2">
          <p className="text-lg">
            &ldquo;Turn raw ideas into polished LinkedIn posts — with your voice, your style, and AI
            precision.&rdquo;
          </p>
        </blockquote>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center p-8">
        {children}
      </div>
    </div>
  )
}
