import type { Node } from 'reactflow';
import type { ProviderFrontendConfig } from '../types';
import { GenericNode } from '@/components/nodes/GenericNode';

/** Stub config for GCP — will be expanded when GCP support ships */
export const gcpFrontendConfig: ProviderFrontendConfig = {
  nodeTypes: {
    genericNode: GenericNode,
  },
  minimapColors: {},
  edgeColors: {},
  typeMeta: {},
  interestingAttrs: {},
  typeConfig: {},
  minimapNodeColor(_node: Node): string {
    return '#4285F4';
  },
};
