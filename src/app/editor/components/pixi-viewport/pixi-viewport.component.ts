import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import type { Application, Container, FederatedPointerEvent, Graphics } from 'pixi.js';
import type { GeneratedMapObject } from '../../../map-model/generated-object.model';
import type { SketchObject } from '../../../map-model/sketch-object.model';
import { GeneratedMapRendererService } from '../../../rendering/generated-map-renderer.service';
import { SketchRendererService } from '../../../rendering/sketch-renderer.service';
import { ToolPointerEvent } from '../../../tools/tool-pointer-event.model';
import { EditorStateService } from '../../services/editor-state.service';
import { ToolDispatcherService } from '../../services/tool-dispatcher.service';

type GraphicsConstructor = new () => Graphics;

@Component({
  selector: 'app-pixi-viewport',
  imports: [],
  templateUrl: './pixi-viewport.component.html',
  styleUrl: './pixi-viewport.component.css',
})
export class PixiViewportComponent implements AfterViewInit, OnDestroy {
  @ViewChild('viewportHost', { static: true })
  private readonly viewportHost!: ElementRef<HTMLDivElement>;

  private readonly state = inject(EditorStateService);
  private readonly toolDispatcher = inject(ToolDispatcherService);
  private readonly sketchRenderer = inject(SketchRendererService);
  private readonly generatedRenderer = inject(GeneratedMapRendererService);
  private app: Application | null = null;
  private generatedLayer: Container | null = null;
  private sketchLayer: Container | null = null;
  private uiLayer: Container | null = null;
  private graphicsConstructor: GraphicsConstructor | null = null;

  constructor() {
    effect(() => {
      const generatedObjects = this.state.generatedObjects();
      const sketchObjects = this.state.sketchObjects();
      const draftSketchObject = this.state.draftSketchObject();
      const selectedObjectId = this.state.selectedObjectId();

      this.renderLayers(generatedObjects, sketchObjects, draftSketchObject, selectedObjectId);
    });
  }

  async ngAfterViewInit(): Promise<void> {
    const { Application, Container, Graphics, Rectangle } = await import('pixi.js');
    const host = this.viewportHost.nativeElement;
    const app = new Application();
    await app.init({
      antialias: true,
      background: '#f5ead6',
      resizeTo: host,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });

    const canvas = app.canvas;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';
    host.appendChild(canvas);

    this.generatedLayer = new Container();
    this.sketchLayer = new Container();
    this.uiLayer = new Container();
    this.graphicsConstructor = Graphics;

    app.stage.addChild(this.generatedLayer, this.sketchLayer, this.uiLayer);
    app.stage.eventMode = 'static';
    app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);
    app.stage.on('pointerdown', this.handlePointerDown);
    app.stage.on('pointermove', this.handlePointerMove);
    app.stage.on('pointerup', this.handlePointerUp);
    app.stage.on('pointerupoutside', this.handlePointerUp);

    this.app = app;
    this.renderCurrentState();
  }

  ngOnDestroy(): void {
    if (!this.app) {
      return;
    }

    this.app.stage.off('pointerdown', this.handlePointerDown);
    this.app.stage.off('pointermove', this.handlePointerMove);
    this.app.stage.off('pointerup', this.handlePointerUp);
    this.app.stage.off('pointerupoutside', this.handlePointerUp);
    this.app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
    this.app = null;
    this.generatedLayer = null;
    this.sketchLayer = null;
    this.uiLayer = null;
    this.graphicsConstructor = null;
  }

  private readonly handlePointerDown = (event: FederatedPointerEvent): void => {
    this.toolDispatcher.handlePointerDown(this.toToolPointerEvent(event));
    this.renderCurrentState();
  };

  private readonly handlePointerMove = (event: FederatedPointerEvent): void => {
    this.toolDispatcher.handlePointerMove(this.toToolPointerEvent(event));
    this.renderCurrentState();
  };

  private readonly handlePointerUp = (event: FederatedPointerEvent): void => {
    this.toolDispatcher.handlePointerUp(this.toToolPointerEvent(event));
    this.renderCurrentState();
  };

  private renderCurrentState(): void {
    this.renderLayers(
      this.state.generatedObjects(),
      this.state.sketchObjects(),
      this.state.draftSketchObject(),
      this.state.selectedObjectId(),
    );
  }

  private renderLayers(
    generatedObjects: readonly GeneratedMapObject[],
    sketchObjects: readonly SketchObject[],
    draftSketchObject: SketchObject | null,
    selectedObjectId: string | null,
  ): void {
    if (!this.generatedLayer || !this.sketchLayer || !this.graphicsConstructor) {
      return;
    }

    const renderedSketchObjects = draftSketchObject
      ? [...sketchObjects, draftSketchObject]
      : sketchObjects;

    this.generatedRenderer.render(this.generatedLayer, this.graphicsConstructor, generatedObjects);
    this.sketchRenderer.render(
      this.sketchLayer,
      this.graphicsConstructor,
      renderedSketchObjects,
      selectedObjectId,
    );
    this.app?.render();
  }

  private toToolPointerEvent(event: FederatedPointerEvent): ToolPointerEvent {
    return {
      position: this.toMapPoint(event),
      pointerId: event.pointerId,
    };
  }

  private toMapPoint(event: FederatedPointerEvent): { x: number; y: number } {
    const app = this.app;

    if (!app) {
      return { x: 0, y: 0 };
    }

    const canvas = app.canvas;
    const rect = canvas.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      return { x: event.global.x, y: event.global.y };
    }

    return {
      x: ((event.clientX - rect.left) / rect.width) * app.screen.width,
      y: ((event.clientY - rect.top) / rect.height) * app.screen.height,
    };
  }
}
