import type { ComponentType } from 'react';
import type { Node } from 'reactflow';

/** Frontend configuration each cloud provider must supply */
export interface ProviderFrontendConfig {
  /** React Flow node type registry (must be stable / module-scoped) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodeTypes: Record<string, ComponentType<any>>;
  /** MiniMap color per node type */
  minimapColors: Record<string, string>;
  /** Edge color per relationship label */
  edgeColors: Record<string, string>;
  /** Resource type → { label, color, Icon } for detail panel */
  typeMeta: Record<string, { label: string; color: string; Icon: ComponentType<{ className?: string }> }>;
  /** Resource type → interesting attribute keys for detail panel */
  interestingAttrs: Record<string, string[]>;
  /** Resource type → { label, Icon } for resource summary badge */
  typeConfig: Record<string, { label: string; Icon: ComponentType<{ className?: string }> }>;
  /** MiniMap node color function */
  minimapNodeColor: (node: Node) => string;
}
