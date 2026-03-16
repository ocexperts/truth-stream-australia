import { Header } from "@/components/Header";

const Media = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-black tracking-tight mb-2">
            <span className="text-gradient-danger">Media</span>
          </h1>
          <p className="text-muted-foreground font-body">
            Listen to featured audio content from ARN.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-8">
          <h2 className="font-display text-xl font-bold mb-4">Kyle</h2>
          <audio
            controls
            className="w-full"
            preload="metadata"
          >
            <source src="/media/KIIS1065 [DAB] 2021-08-11 10-14-08.mp3" type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      </main>
    </div>
  );
};

export default Media;
