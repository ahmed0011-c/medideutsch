import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <div className="card" style={{ maxWidth: 520 }}>
          <h1>Log in</h1>
          <p>
            Accounts are not connected yet. You can play every lesson as a guest. Scores stay in
            this browser. When sign-in is added, guest progress can be merged into the account.
          </p>
          <form className="stack-form" action={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/learn`}>
            <label>
              Email
              <input type="email" name="email" placeholder="you@hospital.org" autoComplete="email" disabled />
            </label>
            <label>
              Password
              <input type="password" name="password" placeholder="••••••••" autoComplete="current-password" disabled />
            </label>
            <button className="btn btn-primary" type="submit" disabled>
              Sign in
            </button>
          </form>
          <p>
            <Link href="/learn">Continue as a guest</Link>
          </p>
        </div>
      </main>
    </>
  );
}
