export function AnnouncementBar() {
  return (
    <div className="relative z-50 hidden border-b border-border bg-background/80 backdrop-blur-md md:block">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-8 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-primary" />
          Built for confidential payroll on Base Sepolia
        </span>
        <span className="hidden lg:inline">
          Powered by <span className="text-foreground">CoFHE</span> privacy flows
        </span>
        <span>
          Employer <span className="text-primary">/</span> Employee journeys
        </span>
      </div>
    </div>
  );
}
