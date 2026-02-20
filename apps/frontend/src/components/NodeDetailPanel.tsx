'use client';

import { useState } from 'react';
import type { AwsResource, GraphEdge } from '@awsarchitect/shared';
import {
  Ec2Icon, RdsIcon, S3Icon, LambdaIcon, LbIcon, VpcIcon,
  SubnetIcon, IgwIcon, NatIcon, SecurityGroupIcon, EipIcon,
  RouteTableIcon, GenericIcon,
} from './nodes/icons/AwsIcons';

// ─── Type label & color mapping ──────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; color: string; Icon: React.FC<{ className?: string }> }> = {
  aws_vpc:                 { label: 'VPC',             color: '#1B660F', Icon: VpcIcon },
  aws_subnet:              { label: 'Subnet',          color: '#147EBA', Icon: SubnetIcon },
  aws_internet_gateway:    { label: 'Internet Gateway', color: '#8C4FFF', Icon: IgwIcon },
  aws_nat_gateway:         { label: 'NAT Gateway',     color: '#8C4FFF', Icon: NatIcon },
  aws_route_table:         { label: 'Route Table',     color: '#8C4FFF', Icon: RouteTableIcon },
  aws_security_group:      { label: 'Security Group',  color: '#DD344C', Icon: SecurityGroupIcon },
  aws_instance:            { label: 'EC2 Instance',    color: '#ED7100', Icon: Ec2Icon },
  aws_db_instance:         { label: 'RDS Database',    color: '#3B48CC', Icon: RdsIcon },
  aws_lb:                  { label: 'Load Balancer',   color: '#8C4FFF', Icon: LbIcon },
  aws_alb:                 { label: 'Load Balancer',   color: '#8C4FFF', Icon: LbIcon },
  aws_eip:                 { label: 'Elastic IP',      color: '#ED7100', Icon: EipIcon },
  aws_s3_bucket:           { label: 'S3 Bucket',       color: '#3F8624', Icon: S3Icon },
  aws_lambda_function:     { label: 'Lambda Function', color: '#ED7100', Icon: LambdaIcon },
};

// Attributes worth showing per resource type
const INTERESTING_ATTRS: Record<string, string[]> = {
  aws_vpc:              ['cidr_block', 'enable_dns_hostnames', 'enable_dns_support'],
  aws_subnet:           ['cidr_block', 'availability_zone', 'map_public_ip_on_launch'],
  aws_instance:         ['instance_type', 'ami', 'availability_zone', 'private_ip', 'public_ip'],
  aws_db_instance:      ['engine', 'engine_version', 'instance_class', 'allocated_storage', 'multi_az'],
  aws_lb:               ['load_balancer_type', 'scheme', 'dns_name'],
  aws_s3_bucket:        ['bucket', 'acl', 'versioning'],
  aws_security_group:   ['description'],
  aws_eip:              ['public_ip', 'allocation_id'],
  aws_nat_gateway:      ['connectivity_type'],
  aws_internet_gateway: [],
  aws_lambda_function:  ['runtime', 'handler', 'memory_size', 'timeout'],
};

function formatAttrKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAttrValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value || '—';
  return JSON.stringify(value);
}

// ─── Component ───────────────────────────────────────────────────────────────

interface NodeDetailPanelProps {
  resource: AwsResource;
  edges: GraphEdge[];
  resources: AwsResource[];
  onClose: () => void;
  onSelectResource?: (nodeId: string) => void;
}

export function NodeDetailPanel({ resource, edges, resources, onClose, onSelectResource }: NodeDetailPanelProps) {
  const [copied, setCopied] = useState(false);
  const meta = TYPE_META[resource.type] ?? { label: resource.type, color: '#7B8794', Icon: GenericIcon };
  const { Icon } = meta;

  // Find connected resources via edges
  const connections = edges
    .filter((e) => e.source === resource.id || e.target === resource.id)
    .map((e) => {
      const otherId = e.source === resource.id ? e.target : e.source;
      const otherResource = resources.find((r) => r.id === otherId);
      const direction = e.source === resource.id ? 'outgoing' : 'incoming';
      return { edge: e, otherResource, direction };
    })
    .filter((c) => c.otherResource);

  // Get interesting attributes for this resource type
  const attrKeys = INTERESTING_ATTRS[resource.type] ?? [];
  const displayAttrs = attrKeys
    .filter((key) => resource.attributes[key] !== undefined && resource.attributes[key] !== null && resource.attributes[key] !== '')
    .map((key) => ({ key, value: resource.attributes[key] }));

  // Tags (excluding Name which is already shown as displayName)
  const tags = Object.entries(resource.tags).filter(([k]) => k !== 'Name');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">{resource.displayName}</h2>
            <p className="text-sm font-medium" style={{ color: meta.color }}>{meta.label}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          aria-label="Close panel"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Terraform ID */}
      <div className="mb-4 px-3 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Terraform ID</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-sm text-slate-600 dark:text-slate-300 font-mono truncate flex-1">{resource.id}</p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(resource.id);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="shrink-0 p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
            title="Copy Terraform ID"
          >
            {copied ? (
              <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Region */}
      {resource.region && (
        <div className="mb-4 px-3 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Region</p>
          <p className="text-sm text-slate-600 mt-0.5">{resource.region}</p>
        </div>
      )}

      {/* Attributes */}
      {displayAttrs.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">Attributes</p>
          <div className="space-y-1.5">
            {displayAttrs.map(({ key, value }) => (
              <div key={key} className="flex justify-between items-baseline gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded">
                <span className="text-xs text-slate-500 shrink-0">{formatAttrKey(key)}</span>
                <span className="text-xs text-slate-700 dark:text-slate-200 font-medium text-right truncate">{formatAttrValue(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">Tags</p>
          <div className="space-y-1.5">
            {tags.map(([k, v]) => (
              <div key={k} className="flex justify-between items-baseline gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded">
                <span className="text-xs text-slate-500 shrink-0">{k}</span>
                <span className="text-xs text-slate-700 dark:text-slate-200 font-medium text-right truncate">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connections */}
      {connections.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">
            Connections ({connections.length})
          </p>
          <div className="space-y-1.5">
            {connections.map(({ edge, otherResource, direction }) => {
              const otherMeta = TYPE_META[otherResource!.type] ?? { label: otherResource!.type, color: '#7B8794', Icon: GenericIcon };
              const OtherIcon = otherMeta.Icon;
              return (
                <button
                  key={edge.id}
                  onClick={() => onSelectResource?.(otherResource!.id)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700/50 rounded w-full text-left hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <OtherIcon className="h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-700 truncate">{otherResource!.displayName}</p>
                    <p className="text-[10px] text-slate-400">
                      {direction === 'outgoing' ? '→' : '←'} {edge.label}
                    </p>
                  </div>
                  <svg className="h-3.5 w-3.5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
