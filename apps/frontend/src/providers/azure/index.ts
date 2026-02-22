import type { ProviderFrontendConfig } from '../types';
import { GenericNode } from '@/components/nodes/GenericNode';

/** Stub config for Azure — will be expanded when Azure support ships */
export const azureFrontendConfig: ProviderFrontendConfig = {
  nodeTypes: {
    genericNode: GenericNode,
  },
  minimapColors: {},
  edgeColors: {},
  typeMeta: {},
  interestingAttrs: {},
  typeConfig: {},
  minimapNodeColor(): string {
    return '#0078D4';
  },
};
