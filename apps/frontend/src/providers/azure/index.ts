import type { Node } from 'reactflow';
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
  minimapNodeColor(_node: Node): string {
    return '#0078D4';
  },
};
