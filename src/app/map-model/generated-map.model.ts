import { GeneratedNonRoadObject } from './generated-object.model';
import { clonePoint } from './point.model';
import { emptyRoadNetwork, RoadNetwork } from './road-network.model';

export const GENERATED_MAP_SCHEMA_VERSION = 2;

export interface GeneratedMap {
  schemaVersion: number;
  roadNetwork: RoadNetwork;
  objects: GeneratedNonRoadObject[];
}

export function emptyGeneratedMap(): GeneratedMap {
  return {
    schemaVersion: GENERATED_MAP_SCHEMA_VERSION,
    roadNetwork: emptyRoadNetwork(),
    objects: [],
  };
}

export function getGeneratedItemCount(map: GeneratedMap): number {
  return map.objects.length + map.roadNetwork.edges.length;
}

export function cloneGeneratedMap(map: GeneratedMap): GeneratedMap {
  return {
    schemaVersion: map.schemaVersion,
    roadNetwork: {
      nodes: map.roadNetwork.nodes.map((node) => ({
        ...node,
        position: clonePoint(node.position),
      })),
      edges: map.roadNetwork.edges.map((edge) => ({
        ...edge,
        points: edge.points.map(clonePoint),
        source: { ...edge.source },
        ...(edge.bridges
          ? {
              bridges: edge.bridges.map((bridge) => ({
                ...bridge,
                position: clonePoint(bridge.position),
              })),
            }
          : {}),
      })),
    },
    objects: map.objects.map((object) => {
      switch (object.type) {
        case 'generated-river':
          return { ...object, points: object.points.map(clonePoint) };
        case 'generated-tree':
        case 'generated-building':
        case 'generated-market-stall':
        case 'generated-industrial-structure':
          return { ...object, position: clonePoint(object.position) };
      }
    }),
  };
}
