'use client';

import { useState } from 'react';
import { Upload } from '@/components/Upload';

export default function Home() {
  const [, setParsedFile] = useState<File | null>(null);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold tracking-tight text-slate-100">AWSArchitect</h1>
      <p className="text-slate-400 text-sm">Upload a Terraform state file to visualize your infrastructure</p>
      <div className="w-full max-w-lg">
        <Upload
          onFileAccepted={(file) => {
            setParsedFile(file);
            console.log('File accepted:', file.name, file.size);
          }}
        />
      </div>
    </main>
  );
}
