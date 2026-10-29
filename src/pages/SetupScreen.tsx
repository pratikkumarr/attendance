import * as React from "react"
import { AlertCircle, Key, ExternalLink } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export function SetupScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <Card className="max-w-lg w-full border-border/80 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-attend/15 flex items-center justify-center text-attend mb-2">
            <Key className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold">Supabase Configuration Required</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Connect your Supabase project to activate the Attendance Planner.
          </p>
        </CardHeader>

        <CardContent className="space-y-4 pt-2 text-sm">
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="font-semibold text-xs text-foreground">1. Configure your environment variables</p>
            <p className="text-xs text-muted-foreground">
              Create a <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">.env.local</code> file in the project root:
            </p>
            <pre className="p-3 bg-muted rounded-md text-[11px] font-mono overflow-x-auto text-foreground">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...`}
            </pre>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
            <p className="font-semibold text-xs text-foreground">2. Execute the Database SQL</p>
            <p className="text-xs text-muted-foreground">
              Ensure you have executed <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">supabase/schema.sql</code> in the Supabase SQL Editor.
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 text-xs rounded-lg border border-safe/30 bg-safe/10 text-safe">
            <AlertCircle className="h-4 w-4 shrink-0 text-safe" />
            <span>
              <strong>Note:</strong> The anon key is public by design. Security is enforced by Postgres Row-Level Security (RLS). Never use or leak your service_role key.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
