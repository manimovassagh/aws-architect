interface IconProps {
  className?: string;
}

export function GcpVpcIcon({ className = 'h-8 w-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="4" width="32" height="32" rx="2" fill="#34A853" />
      <rect x="10" y="10" width="20" height="20" rx="2" stroke="white" strokeWidth="2" fill="none" />
      <circle cx="15" cy="20" r="2" fill="white" />
      <circle cx="25" cy="20" r="2" fill="white" />
      <line x1="17" y1="20" x2="23" y2="20" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

export function GcpSubnetIcon({ className = 'h-8 w-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="4" width="32" height="32" rx="2" fill="#4285F4" />
      <rect x="10" y="10" width="20" height="20" rx="1" stroke="white" strokeWidth="2" strokeDasharray="4 2" fill="none" />
      <circle cx="16" cy="20" r="2" fill="white" />
      <circle cx="24" cy="20" r="2" fill="white" />
    </svg>
  );
}

export function GcpInstanceIcon({ className = 'h-8 w-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="4" width="32" height="32" rx="2" fill="#FBBC04" />
      <rect x="10" y="12" width="20" height="14" rx="1" stroke="white" strokeWidth="2" fill="none" />
      <line x1="14" y1="16" x2="26" y2="16" stroke="white" strokeWidth="1.5" />
      <line x1="14" y1="20" x2="26" y2="20" stroke="white" strokeWidth="1.5" />
      <circle cx="14" cy="24" r="1.5" fill="white" />
    </svg>
  );
}

export function GcpFirewallIcon({ className = 'h-8 w-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="4" width="32" height="32" rx="2" fill="#EA4335" />
      <path d="M20 8l10 5v8c0 5-4 9-10 11-6-2-10-6-10-11v-8l10-5z" stroke="white" strokeWidth="2" fill="none" />
      <path d="M17 20l2 2 4-4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GcpAddressIcon({ className = 'h-8 w-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="4" width="32" height="32" rx="2" fill="#4285F4" />
      <circle cx="20" cy="18" r="6" stroke="white" strokeWidth="2" fill="none" />
      <path d="M20 24v6" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="18" r="2" fill="white" />
    </svg>
  );
}

export function GcpStorageIcon({ className = 'h-8 w-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="4" width="32" height="32" rx="2" fill="#34A853" />
      <path d="M12 12h16l-2 16H14L12 12z" stroke="white" strokeWidth="2" fill="none" />
      <path d="M12 12c0 1.5 3.6 3 8 3s8-1.5 8-3" stroke="white" strokeWidth="1.5" fill="none" />
      <line x1="14" y1="22" x2="26" y2="22" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

export function GcpSqlIcon({ className = 'h-8 w-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="4" width="32" height="32" rx="2" fill="#0F9D58" />
      <ellipse cx="20" cy="14" rx="10" ry="4" stroke="white" strokeWidth="2" fill="none" />
      <path d="M10 14v12c0 2.2 4.5 4 10 4s10-1.8 10-4V14" stroke="white" strokeWidth="2" fill="none" />
      <path d="M10 20c0 2.2 4.5 4 10 4s10-1.8 10-4" stroke="white" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function GcpFunctionIcon({ className = 'h-8 w-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="4" width="32" height="32" rx="2" fill="#FBBC04" />
      <path d="M16 10l-4 10h8l-4 10" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 14h6M22 20h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function GcpLbIcon({ className = 'h-8 w-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="4" width="32" height="32" rx="2" fill="#AB47BC" />
      <circle cx="20" cy="20" r="10" stroke="white" strokeWidth="2" fill="none" />
      <path d="M15 16l5 4-5 4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="20" y1="12" x2="20" y2="28" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

export function GcpNatIcon({ className = 'h-8 w-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="4" width="32" height="32" rx="2" fill="#4285F4" />
      <path d="M12 20h16M24 16l4 4-4 4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="10" y="14" width="8" height="12" rx="1" stroke="white" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function GcpRouteIcon({ className = 'h-8 w-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="4" width="32" height="32" rx="2" fill="#4285F4" />
      <rect x="10" y="10" width="20" height="20" rx="1" stroke="white" strokeWidth="2" fill="none" />
      <line x1="10" y1="16" x2="30" y2="16" stroke="white" strokeWidth="1.5" />
      <line x1="10" y1="22" x2="30" y2="22" stroke="white" strokeWidth="1.5" />
      <line x1="20" y1="10" x2="20" y2="30" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

export function GcpGenericIcon({ className = 'h-8 w-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="4" width="32" height="32" rx="2" fill="#4285F4" />
      <rect x="12" y="12" width="16" height="16" rx="2" stroke="white" strokeWidth="2" fill="none" />
      <circle cx="20" cy="20" r="3" fill="white" />
    </svg>
  );
}
