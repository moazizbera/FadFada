export default function LoadingPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-breathe rounded-full bg-gold/20" />
        <p className="font-arsans text-sm text-bone/40">Loading...</p>
      </div>
    </div>
  );
}
