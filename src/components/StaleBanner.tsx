type StaleBannerProps = {
  stale: boolean;
  generatedAt: string;
  staleAfterHours: number;
};

function formatGeneratedAt(generatedAt: string): string {
  const generatedDate = new Date(generatedAt);
  const generatedMs = generatedDate.getTime();

  if (!Number.isFinite(generatedMs)) {
    return "an unknown time";
  }

  return generatedDate.toLocaleString();
}

export function StaleBanner({ stale, generatedAt, staleAfterHours }: StaleBannerProps) {
  const generatedMs = new Date(generatedAt).getTime();
  const computedStale =
    Number.isFinite(generatedMs) &&
    Date.now() - generatedMs > staleAfterHours * 60 * 60 * 1000;

  if (!stale && !computedStale) {
    return null;
  }

  return (
    <aside className="stale-banner animate-fade-up" role="status" aria-live="polite">
      Snapshot may be stale. Last generated at {formatGeneratedAt(generatedAt)}. Refresh target
      is every {staleAfterHours} hours.
    </aside>
  );
}
