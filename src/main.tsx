/* eslint-disable react-refresh/only-export-components */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { validateEnv } from '@/lib/env';

interface ConfigErrorScreenProps {
  errors: string[];
}

function ConfigErrorScreen({ errors }: ConfigErrorScreenProps) {
  return (
    <div className="bg-background text-foreground flex min-h-screen items-center justify-center p-4">
      <div className="border-destructive/30 bg-card w-full max-w-xl rounded-xl border p-6 shadow-lg sm:p-8">
        <div className="flex items-center gap-3">
          <div className="bg-destructive/15 text-destructive flex size-10 items-center justify-center rounded-lg">
            <svg
              className="size-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-foreground text-xl font-bold tracking-tight">
              Configuration Error
            </h1>
            <p className="text-muted-foreground text-sm">
              Missing or invalid environment variables
            </p>
          </div>
        </div>

        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
          The application cannot start because one or more required environment
          variables are missing or invalid in your{' '}
          <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
            .env.local
          </code>{' '}
          file:
        </p>

        <ul className="border-border bg-muted/50 text-destructive mt-3 space-y-1.5 rounded-lg border p-3.5 font-mono text-xs">
          {errors.map((err) => (
            <li key={err} className="flex items-start gap-1.5">
              <span className="text-muted-foreground select-none">•</span>
              <span>{err}</span>
            </li>
          ))}
        </ul>

        <div className="bg-secondary/50 text-muted-foreground mt-5 rounded-lg p-3.5 text-xs">
          <p className="text-foreground font-semibold">How to fix:</p>
          <ol className="mt-1.5 list-inside list-decimal space-y-1">
            <li>
              Ensure you have a valid{' '}
              <code className="text-foreground font-mono">.env.local</code> in
              the project root.
            </li>
            <li>
              Compare your keys with{' '}
              <code className="text-foreground font-mono">.env.example</code>.
            </li>
            <li>
              Restart the development server after updating your environment
              file.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Failed to find root element with id 'root'");
}

const root = createRoot(rootElement);

const envResult = validateEnv();

if (!envResult.success) {
  root.render(
    <StrictMode>
      <ConfigErrorScreen errors={envResult.errors} />
    </StrictMode>,
  );
} else {
  void import('@/App').then(({ App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
}
