import { Injectable } from '@angular/core';
import { GENERATED_MAP_SCHEMA_VERSION, GeneratedMap } from '../map-model/generated-map.model';
import { GeneratedNonRoadObject } from '../map-model/generated-object.model';
import { clonePoint } from '../map-model/point.model';
import { SketchObject } from '../map-model/sketch-object.model';
import { getZoneCoveragePolygon } from '../map-model/zone-coverage.util';
import { IndexedRiver, IndexedZone } from './generation-context';
import { DistrictRoadPlanner } from './road-network/district-road-planner';
import { RoadNetworkBuilder } from './road-network/road-network-builder';
import { RoadNetworkValidator } from './road-network/road-network-validator';
import { RoadSketchNormalizer } from './road-network/road-sketch-normalizer';
import { StructurePlacementService } from './structure-placement';

@Injectable({ providedIn: 'root' })
export class MapGeneratorService {
  private readonly roadNormalizer = new RoadSketchNormalizer();
  private readonly districtPlanner = new DistrictRoadPlanner();
  private readonly placement = new StructurePlacementService();
  private readonly validator = new RoadNetworkValidator();

  generate(sketchObjects: readonly SketchObject[]): GeneratedMap {
    const generationSketch = this.cloneSketchObjects(sketchObjects);
    const rivers = generationSketch.flatMap((object, index) =>
      object.type === 'river' ? [{ object, index } satisfies IndexedRiver] : [],
    );
    const zones = generationSketch.flatMap((object, index) =>
      object.type === 'zone' ? [{ object, index } satisfies IndexedZone] : [],
    );
    const baseNetwork = this.roadNormalizer.normalize(generationSketch);
    const builder = new RoadNetworkBuilder(baseNetwork);

    for (const zone of zones) {
      this.districtPlanner.plan(zone, zones, rivers, builder);
    }

    const roadNetwork = builder.toNetwork();
    this.validator.assertValid(roadNetwork, [], { zones, rivers });
    const objects: GeneratedNonRoadObject[] = [
      ...rivers.map((river) => ({
        id: `generated-${river.object.id}`,
        type: 'generated-river' as const,
        points: river.object.points.map(clonePoint),
        width: river.object.width + 8,
      })),
      ...zones.flatMap((zone) => this.placement.generateForZone(zone, zones, rivers, roadNetwork)),
    ];

    this.validator.assertValid(roadNetwork, objects, { zones, rivers });
    return { schemaVersion: GENERATED_MAP_SCHEMA_VERSION, roadNetwork, objects };
  }

  private cloneSketchObjects(sketchObjects: readonly SketchObject[]): SketchObject[] {
    return sketchObjects.map((object) => {
      switch (object.type) {
        case 'river':
          return { ...object, points: object.points.map(clonePoint) };
        case 'road':
          return { ...object, points: object.points.map(clonePoint) };
        case 'zone': {
          const clone = {
            ...object,
            ...(object.polygon ? { polygon: object.polygon.map(clonePoint) } : {}),
            ...(object.brushStamps
              ? {
                  brushStamps: object.brushStamps.map((stamp) => ({
                    ...stamp,
                    position: clonePoint(stamp.position),
                  })),
                }
              : {}),
          };
          const polygon = getZoneCoveragePolygon(clone);
          return { ...clone, polygon: polygon.map(clonePoint) };
        }
        case 'marker':
          return { ...object, position: clonePoint(object.position) };
      }
    });
  }
}
