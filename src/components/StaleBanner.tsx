type StaleBannerProps = {
  stale: boolean;
  generatedAt: string;
  staleAfterHours: number;
};

export function StaleBanner({ stale, generatedAt, staleAfterHours }: StaleBannerProps) {
  const generatedMs = new Date(generatedAt).getTime();
  const computedStale =
    Number.isFinite(generatedMs) &&
    Date.now() - generatedMs > staleAfterHours * 60 * 60 * 1000;
  if (!stale && !computedStale) return null;
  return (
    <aside className="stale-banner" role="status">
      Data may be stale. Last generated at {new Date(generatedAt).toLocaleString()} and refresh
      threshold is {staleAfterHours} hours.
    </aside>
  );
}
