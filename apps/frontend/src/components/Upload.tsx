import { useCallback, useRef, useState } from 'react';

export type UploadMode = 'tfstate' | 'hcl';

type UploadState = 'idle' | 'dragging' | 'ready' | 'invalid';

interface UploadProps {
  mode: UploadMode;
  onFileAccepted: (file: File) => void;
  onFilesAccepted: (files: File[]) => void;
}

const TFSTATE_EXTENSIONS = ['.tfstate', '.json'];
const HCL_EXTENSIONS = ['.tf'];
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

function validateFile(file: File, mode: UploadMode): string | null {
  const ext = file.name.slice(file.name.lastIndexOf('.'));
  const accepted = mode === 'hcl' ? HCL_EXTENSIONS : TFSTATE_EXTENSIONS;
  if (!accepted.includes(ext)) {
    return `Invalid file type "${ext}". Only ${accepted.join(', ')} files are accepted.`;
  }
  if (file.size > MAX_SIZE) {
    return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 50 MB.`;
  }
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Upload({ mode, onFileAccepted, onFilesAccepted }: UploadProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((fileList: File[]) => {
    const errors: string[] = [];
    const valid: File[] = [];
    for (const f of fileList) {
      const err = validateFile(f, mode);
      if (err) errors.push(err);
      else valid.push(f);
    }
    if (errors.length > 0) {
      setState('invalid');
      setError(errors[0]!);
      setFiles([]);
    } else if (valid.length > 0) {
      setState('ready');
      setError(null);
      setFiles(valid);
    }
  }, [mode]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState((s) => (s === 'ready' ? s : 'dragging'));
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState((s) => (s === 'ready' ? s : 'idle'));
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) handleFiles(dropped);
    },
    [handleFiles],
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      if (selected.length > 0) handleFiles(selected);
    },
    [handleFiles],
  );

  const reset = () => {
    setState('idle');
    setFiles([]);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSubmit = () => {
    if (mode === 'hcl') {
      onFilesAccepted(files);
    } else {
      if (files[0]) onFileAccepted(files[0]);
    }
  };

  const isMultiple = mode === 'hcl';
  const acceptStr = mode === 'hcl' ? '.tf' : '.tfstate,.json';
  const fileTypeLabel = mode === 'hcl' ? '.tf' : '.tfstate';

  const borderColor =
    state === 'dragging'
      ? 'border-blue-400'
      : state === 'ready'
        ? 'border-emerald-400'
        : state === 'invalid'
          ? 'border-red-400'
          : 'border-slate-300';

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed
        p-12 transition-colors cursor-pointer bg-white hover:bg-slate-50
        ${borderColor}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptStr}
        multiple={isMultiple}
        onChange={onInputChange}
        className="hidden"
      />

      {state === 'idle' || state === 'dragging' ? (
        <>
          <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
          </svg>
          <p className="text-slate-500 text-sm">
            {state === 'dragging'
              ? 'Drop your file(s) here'
              : `Drag & drop ${fileTypeLabel} file${isMultiple ? '(s)' : ''}, or click to browse`}
          </p>
        </>
      ) : state === 'ready' && files.length > 0 ? (
        <>
          <div className="text-center">
            {files.length === 1 ? (
              <>
                <p className="text-slate-800 font-medium">{files[0]!.name}</p>
                <p className="text-slate-500 text-xs mt-1">{formatSize(files[0]!.size)}</p>
              </>
            ) : (
              <>
                <p className="text-slate-800 font-medium">{files.length} files selected</p>
                <p className="text-slate-500 text-xs mt-1">
                  {files.map((f) => f.name).join(', ')}
                </p>
              </>
            )}
          </div>
          <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={reset}
              className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm rounded-md bg-[#ED7100] text-white hover:bg-[#d96600] transition-colors font-medium"
            >
              Parse
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-red-600 text-sm text-center">{error}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}
