import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";

export function EnrollMFA({ onEnrolled }: { onEnrolled: () => void }) {
  const [qrCode, setQrCode] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "enrolled">("idle");

  const handleEnroll = async () => {
    setLoading(true);
    try {
      const data = await api.mfaEnroll();
      setQrCode(data.qr_code);
      setStep("enrolled");
    } catch (err: any) {
      toast.error(err.message || "Failed to start 2FA setup");
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      await api.mfaVerify(verifyCode);
      toast.success("2FA enabled successfully!");
      onEnrolled();
    } catch (err: any) {
      toast.error(err.message || "Invalid code");
    }
    setLoading(false);
  };

  if (step === "idle") {
    return (
      <div className="border border-border bg-card p-6 rounded">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="font-display font-bold">Two-Factor Authentication</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Add an extra layer of security by enabling 2FA with an authenticator app.
        </p>
        <Button variant="hero" size="sm" onClick={handleEnroll} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Set Up 2FA
        </Button>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card p-6 rounded">
      <div className="flex items-center gap-3 mb-4">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h3 className="font-display font-bold">Scan QR Code</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Scan this QR code with your authenticator app, then enter the 6-digit code.
      </p>
      <div className="flex flex-col items-center gap-4 mb-4">
        <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded border border-border" />
      </div>
      <div className="max-w-xs mx-auto space-y-3">
        <div>
          <Label htmlFor="totp-code" className="text-muted-foreground">Verification Code</Label>
          <Input
            id="totp-code"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            maxLength={6}
            className="mt-1 bg-secondary border-border text-center text-lg tracking-widest"
          />
        </div>
        <Button variant="hero" className="w-full" onClick={handleVerify} disabled={loading || verifyCode.length !== 6}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Verify & Enable
        </Button>
      </div>
    </div>
  );
}

export function MFAChallenge({ onVerified }: { onVerified: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    try {
      await api.mfaVerify(code.replace(/\D/g, ""));
      onVerified();
      window.location.reload();
    } catch {
      toast.error("Invalid code. Try again.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm border border-border bg-card p-8">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h2 className="font-display text-xl font-bold">2FA Verification</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Enter the 6-digit code from your authenticator app.
        </p>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          maxLength={6}
          className="bg-secondary border-border text-center text-lg tracking-widest mb-4"
          onKeyDown={(e) => {
            if (e.key === "Enter" && code.length === 6) handleVerify();
          }}
        />
        <Button variant="hero" className="w-full" onClick={handleVerify} disabled={loading || code.length !== 6}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Verify
        </Button>
      </div>
    </div>
  );
}
