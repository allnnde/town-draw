import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { App } from './app';

@Component({
  selector: 'app-editor-page',
  template: `
    <section>
      <h1>TownDraw</h1>
      <button type="button">Generar mapa</button>
      <button type="button">Exportar JSON</button>
      <button type="button">Importar JSON</button>
      <button type="button">Limpiar mapa</button>
    </section>
  `,
})
class EditorPageStubComponent {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] })
      .overrideComponent(App, {
        set: { imports: [EditorPageStubComponent] },
      })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render editor shell', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('TownDraw');
    expect(compiled.textContent).toContain('Generar mapa');
    expect(compiled.textContent).toContain('Exportar JSON');
    expect(compiled.textContent).toContain('Importar JSON');
    expect(compiled.textContent).toContain('Limpiar mapa');
  });
});
