import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { SessionService } from './session.service';

describe('AppComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  async function render() {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    http.expectOne('/api/config').flush({
      success: true,
      network: 'Ethereum Sepolia',
      chainId: 11155111,
      contractAddress: '0x309851a5faa5e1f9cd3bb3405c8e97b71bdbd735',
      explorer: 'https://sepolia.etherscan.io',
    });
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('affiche les 4 etapes, le reseau et un lien vers le contrat', async () => {
    const fixture = await render();
    const page: HTMLElement = fixture.nativeElement;

    expect(page.querySelectorAll('.step').length).toBe(4);
    expect(page.querySelector('#pills')!.textContent).toContain('Ethereum Sepolia');
    const link = page.querySelector<HTMLAnchorElement>('#pills a')!;
    expect(link.href).toBe('https://sepolia.etherscan.io/address/0x309851a5faa5e1f9cd3bb3405c8e97b71bdbd735');
    expect(page.querySelector('#emptyJournal')).not.toBeNull();
  });

  it('met en avant la premiere etape non terminee', async () => {
    const fixture = await render();
    const session = TestBed.inject(SessionService);
    const steps = () => Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.step'));

    expect(steps().map((s) => s.classList.contains('active'))).toEqual([true, false, false, false]);

    session.markDone('register');
    fixture.detectChanges();
    expect(steps().map((s) => s.classList.contains('done'))).toEqual([true, false, false, false]);
    expect(steps().map((s) => s.classList.contains('active'))).toEqual([false, true, false, false]);
  });

  it('sans lien Etherscan sur un reseau local', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    http.expectOne('/api/config').flush({ success: true, network: 'Réseau local (test)', chainId: 31337, contractAddress: '0x5fbdb2315678afecb367f032d93f642f64180aa3', explorer: null });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#pills a')).toBeNull();
  });
});
