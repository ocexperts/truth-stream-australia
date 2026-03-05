import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";

export function EnrollMFA({ onEnrolled }: { onEnrolled: () => void }) {
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "enrolled">("idle");

  const handleEnroll = async () => {
    setLoading(true);

    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      toast.error(factorsError.message);
      setLoading(false);
      return;
    }

    const totpFactors = factors?.totp || [];
    const verifiedFactor = totpFactors.find((f: any) => f.status === "verified");
    if (verifiedFactor) {
      toast.success("2FA is already enabled for this account.");
      onEnrolled();
      setLoading(false);
      return;
    }

    const unverifiedFactors = totpFactors.filter((f: any) => f.status === "unverified");
    for (const factor of unverifiedFactors) {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (unenrollError) {
        toast.error(`Could not reset previous setup: ${unenrollError.message}`);
        setLoading(false);
        return;
      }
    }

    let { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator App",
    });

    if (error?.message?.includes("already exists")) {
      const { data: refreshedFactors } = await supabase.auth.mfa.listFactors();
      const refreshedTotp = refreshedFactors?.totp || [];
      const refreshedVerified = refreshedTotp.find((f: any) => f.status === "verified");

      if (refreshedVerified) {
        toast.success("2FA is already enabled for this account.");
        onEnrolled();
        setLoading(false);
        return;
      }

      for (const factor of refreshedTotp.filter((f: any) => f.status === "unverified")) {
        const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (unenrollError) {
          toast.error(`Could not reset previous setup: ${unenrollError.message}`);
          setLoading(false);
          return;
        }
      }

      const retry = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator App ${new Date().toISOString()}`,
      });

      data = retry.data;
      error = retry.error;
    }

    if (error || !data?.totp?.qr_code) {
      toast.error(error?.message || "Failed to start 2FA setup");
      setLoading(false);
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setStep("enrolled");
    setLoading(false);
  };

  const handleVerify = async () => {
    setLoading(true);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeError) {
      toast.error(challengeError.message);
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: verifyCode,
    });
    if (verifyError) {
      toast.error(verifyError.message);
      setLoading(false);
      return;
    }

    toast.success("2FA enabled successfully!");
    onEnrolled();
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
        Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code.
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
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.[0];

    if (!totp) {
      toast.error("No 2FA factor found");
      setLoading(false);
      return;
    }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: totp.id,
    });
    if (challengeError) {
      toast.error(challengeError.message);
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.mfa.verify({
      factorId: totp.id,
      challengeId: challenge.id,
      code,
    });
    if (error) {
      toast.error("Invalid code. Try again.");
    } else {
      onVerified();
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
          onChange={(e) => setCode(e.target.value)}
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
