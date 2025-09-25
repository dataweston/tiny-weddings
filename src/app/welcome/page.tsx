import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Tiny Diner Weddings • Welcome",
};

export default function WelcomePage() {
  return (
    <main className="min-h-dvh bg-gradient-to-br from-[#f6f4f1] via-white to-[#f5fbff] text-slate-900 flex items-center px-6 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <Card className="border-2 border-rose-100/70 bg-white/80 shadow-xl shadow-rose-100/40 backdrop-blur">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="flex h-24 w-40 items-center justify-center rounded-xl border border-rose-100 bg-white p-3 shadow-sm">
                <Image
                  src="/tiny-diner-logo.png"
                  alt="Tiny Diner logo"
                  width={240}
                  height={110}
                  priority
                  className="h-auto w-full object-contain"
                />
              </span>
              <div className="space-y-2">
                <Badge className="bg-rose-500 hover:bg-rose-600">New 2025 Portal</Badge>
                <CardTitle className="text-4xl font-semibold tracking-tight">Weddings at Tiny Diner</CardTitle>
                <CardDescription className="text-base leading-relaxed text-slate-600 max-w-prose">
                  Reserve your date, customize your celebration, sync to HoneyBook, and submit your secure deposit—all in one guided flow.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <section className="grid gap-6 md:grid-cols-3">
              <ValueTile title="Pick Your Date" text="Real-time availability for prime evenings Thursday–Saturday." />
              <ValueTile title="Customize or Streamline" text="Choose our signature experience or build a bespoke plan." />
              <ValueTile title="Sync & Pay" text="HoneyBook project creation + secure Square deposit checkout." />
            </section>
            <div className="flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="bg-rose-600 hover:bg-rose-700 text-white px-10">
                <Link href="/">Get Started</Link>
              </Button>
              <p className="text-sm text-slate-500 max-w-xs">
                You can return here anytime—your progress saves automatically in the booking dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function ValueTile({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-slate-200/70 bg-white/70 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-xs text-slate-600 leading-relaxed">{text}</p>
    </div>
  );
}
