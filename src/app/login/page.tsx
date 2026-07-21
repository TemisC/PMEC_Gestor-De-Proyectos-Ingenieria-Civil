import LoginForm from "@/components/login-form";
import { Card } from "@/components/ui/card";
import { LogoIcon } from "@/components/ui/icons";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-900 p-6">
      <div className="flex flex-col items-center gap-2">
        <LogoIcon className="h-10 w-10 text-sky-400" />
        <h1 className="text-xl font-bold text-white">PMEC</h1>
      </div>
      <Card className="w-full max-w-sm">
        <LoginForm />
      </Card>
    </main>
  );
}
