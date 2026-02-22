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
  minimapNodeColor(): string {
    return '#4285F4';
  },
};
