// import Image from "next/image";
import DashboardPage from "./dashboard/page";
import LoginPage from "./(auth)/login/page";



export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <DashboardPage />
        <LoginPage />
        <h1 className="text-5xl font-bold">Welcome to DevConnect!</h1>
      </div>
    </main>
  );
}
