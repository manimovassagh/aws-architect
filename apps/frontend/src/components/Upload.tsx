import { useCallback, useRef, useState } from 'react';

type UploadState = 'idle' | 'dragging' | 'ready' | 'invalid';

interface UploadProps {
  onSubmit: (files: File[], mode: 'tfstate' | 'hcl' | 'cfn') => void;
}

const TFSTATE_EXTENSIONS = ['.tfstate'];
const HCL_EXTENSIONS = ['.tf'];
const CFN_EXTENSIONS = ['.yaml', '.yml', '.template'];
const AMBIGUOUS_EXTENSIONS = ['.json']; // Could be tfstate or CFN
const ALL_EXTENSIONS = [...TFSTATE_EXTENSIONS, ...HCL_EXTENSIONS, ...CFN_EXTENSIONS, ...AMBIGUOUS_EXTENSIONS];
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

type DetectedMode = 'tfstate' | 'hcl' | 'cfn' | 'mixed' | 'unknown';

function detectMode(files: File[]): { mode: DetectedMode; error?: string; needsContentCheck?: File } {
  let hasTfstate = false;
  let hasHcl = false;
  let hasCfn = false;
  let hasUnknown = false;
  let ambiguousFile: File | undefined;

  for (const f of files) {
    const name = f.name.toLowerCase();
    const ext = name.slice(name.lastIndexOf('.'));
    if (TFSTATE_EXTENSIONS.includes(ext) || name.endsWith('.tfstate')) hasTfstate = true;
    else if (HCL_EXTENSIONS.includes(ext)) hasHcl = true;
    else if (CFN_EXTENSIONS.includes(ext)) hasCfn = true;
    else if (AMBIGUOUS_EXTENSIONS.includes(ext)) ambiguousFile = f;
    else hasUnknown = true;
  }

  if (hasUnknown && !hasTfstate && !hasHcl && !hasCfn && !ambiguousFile) {
    return { mode: 'unknown', error: 'Unsupported file type. Accepted: .tfstate, .json, .tf, .yaml, .yml, .template' };
  }

  const typeCount = [hasTfstate, hasHcl, hasCfn].filter(Boolean).length;
  if (typeCount > 1) {
    return { mode: 'mixed', error: 'Cannot mix file types. Upload one type at a time.' };
  }

  if (hasTfstate) return { mode: 'tfstate' };
  if (hasHcl) return { mode: 'hcl' };
  if (hasCfn) return { mode: 'cfn' };

  // Only ambiguous .json files remain — need content-based detection
  if (ambiguousFile) {
    return { mode: 'unknown', needsContentCheck: ambiguousFile };
  }

  return { mode: 'unknown', error: 'No supported files found.' };
}

/** Detect whether a .json file is a tfstate or CloudFormation template by reading its content. */
async function detectJsonType(file: File): Promise<'tfstate' | 'cfn'> {
  const text = await file.text();
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === 'object') {
      // CloudFormation: has Resources with Type: "AWS::..."
      if (obj.AWSTemplateFormatVersion || obj.Resources) {
        const resources = obj.Resources;
        if (resources && typeof resources === 'object') {
          const firstValue = Object.values(resources)[0] as Record<string, unknown> | undefined;
          if (firstValue?.Type && typeof firstValue.Type === 'string' && firstValue.Type.startsWith('AWS::')) {
            return 'cfn';
          }
        }
      }
      // Terraform state: has version + resources array
      if (obj.version !== undefined && Array.isArray(obj.resources)) {
        return 'tfstate';
      }
    }
  } catch {
    // Not valid JSON — fall through to default
  }
  return 'tfstate'; // default fallback
}

function validateFiles(files: File[]): string | null {
  for (const f of files) {
    if (f.size > MAX_SIZE) {
      return `File too large: ${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB). Maximum is 50 MB.`;
    }
  }
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Filter to only supported extensions */
function filterSupported(files: File[]): File[] {
  return files.filter((f) => {
    const ext = f.name.slice(f.name.lastIndexOf('.'));
    return ALL_EXTENSIONS.includes(ext);
  });
}

export function Upload({ onSubmit }: UploadProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [files, setFiles] = useState<File[]>([]);
  const [detectedMode, setDetectedMode] = useState<'tfstate' | 'hcl' | 'cfn'>('tfstate');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (fileList: File[]) => {
    // Filter to supported files (handles folder drops with mixed content)
    const supported = filterSupported(fileList);
    if (supported.length === 0) {
      setState('invalid');
      setError('No supported files found. Drop .tfstate, .json, .tf, .yaml, or .yml files.');
      setFiles([]);
      return;
    }

    const sizeErr = validateFiles(supported);
    if (sizeErr) {
      setState('invalid');
      setError(sizeErr);
      setFiles([]);
      return;
    }

    const { mode, error: modeErr, needsContentCheck } = detectMode(supported);
    if (modeErr) {
      setState('invalid');
      setError(modeErr);
      setFiles([]);
      return;
    }

    // For ambiguous .json files, detect by content
    if (needsContentCheck) {
      const detected = await detectJsonType(needsContentCheck);
      setState('ready');
      setError(null);
      setDetectedMode(detected);
      setFiles(supported);
      return;
    }

    setState('ready');
    setError(null);
    setDetectedMode(mode as 'tfstate' | 'hcl' | 'cfn');
    setFiles(supported);
  }, []);

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
      if (dropped.length > 0) void handleFiles(dropped);
    },
    [handleFiles],
  );

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      if (selected.length > 0) void handleFiles(selected);
    },
    [handleFiles],
  );

  const reset = () => {
    setState('idle');
    setFiles([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    onSubmit(files, detectedMode);
  };

  const borderColor =
    state === 'dragging'
      ? 'border-blue-400'
      : state === 'ready'
        ? 'border-emerald-400'
        : state === 'invalid'
          ? 'border-red-400'
          : 'border-slate-300 dark:border-slate-600';

  return (
    <label
      htmlFor={state !== 'ready' ? 'upload-file-input' : undefined}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`
        upload-glow flex flex-col items-center justify-center gap-3 rounded-xl border-[3px] border-dashed
        p-8 transition-all bg-white dark:bg-white/10 backdrop-blur-sm cursor-pointer
        ${borderColor}
      `}
    >
      <input
        ref={fileInputRef}
        id="upload-file-input"
        type="file"
        accept={ALL_EXTENSIONS.join(',')}
        multiple
        onChange={onFileInputChange}
        className="hidden"
      />

      {state === 'idle' || state === 'dragging' ? (
        <>
          <svg className="h-12 w-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
          </svg>
          <p className="text-slate-700 dark:text-slate-300 text-lg font-medium">
            {state === 'dragging'
              ? 'Drop your file(s) here'
              : 'Drop .tfstate, .tf, or CloudFormation templates here'}
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-base">
            Click to browse — or drag files and folders
          </p>
        </>
      ) : state === 'ready' && files.length > 0 ? (
        <>
          <div className="text-center">
            {files.length === 1 ? (
              <>
                <p className="text-slate-800 dark:text-slate-200 font-medium">{files[0]!.name}</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{formatSize(files[0]!.size)}</p>
              </>
            ) : (
              <>
                <p className="text-slate-800 dark:text-slate-200 font-medium">{files.length} files selected</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  {files.map((f) => f.name).join(', ')}
                </p>
              </>
            )}
            <p className="text-xs mt-1.5 text-slate-400 dark:text-slate-500">
              Detected: <span className="font-mono">{detectedMode === 'tfstate' ? '.tfstate' : detectedMode === 'hcl' ? '.tf' : 'CloudFormation'}</span>
            </p>
          </div>
          <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={reset}
              className="px-4 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
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
          <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            className="px-4 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Try again
          </button>
        </>
      )}
    </label>
  );
}
