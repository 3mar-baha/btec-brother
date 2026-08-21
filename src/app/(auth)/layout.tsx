import { AnimatedBackground } from "@/components/ui/animated-background";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <AnimatedBackground />
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
