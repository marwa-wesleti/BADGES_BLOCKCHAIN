import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { guestGuard, roleGuard, safeReturnUrl } from './guards';
import { TokenStore } from './token.store';

const route = {} as ActivatedRouteSnapshot;
const state = (url: string) => ({ url }) as RouterStateSnapshot;
const user = (role: 'ECOLE' | 'ELEVE') => ({ id: 1, username: 'u', email: 'u@example.com', walletAddress: '0x1', role });

describe('gardes de routes', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  const run = (guard: ReturnType<typeof roleGuard> | typeof guestGuard, url = '/ecole/cours') =>
    TestBed.runInInjectionContext(() => guard(route, state(url))) as Promise<boolean | UrlTree>;

  it('personne n\'est connecte : retour a la connexion, en retenant la page voulue', async () => {
    const result = (await run(roleGuard('ECOLE'), '/ecole/cours')) as UrlTree;
    expect(result.toString()).toBe('/connexion?retour=%2Fecole%2Fcours');
  });

  it('un eleve qui tente l\'espace ecole est renvoye vers son propre espace', async () => {
    auth.user.set(user('ELEVE'));
    const result = (await run(roleGuard('ECOLE'))) as UrlTree;
    expect(result.toString()).toBe('/eleve');
  });

  it('le bon profil passe', async () => {
    auth.user.set(user('ECOLE'));
    expect(await run(roleGuard('ECOLE'))).toBeTrue();
  });

  it('attend la restauration de la session avant de decider (jeton valide present)', async () => {
    TestBed.inject(TokenStore).set('jeton');
    const pending = run(roleGuard('ELEVE'), '/eleve/mon-espace');
    http.expectOne('/api/me').flush({ success: true, user: user('ELEVE'), badges: [], nftBadges: [] });
    expect(await pending).toBeTrue();
  });

  it('connexion et inscription renvoient un utilisateur deja connecte vers son espace', async () => {
    auth.user.set(user('ECOLE'));
    expect(((await run(guestGuard)) as UrlTree).toString()).toBe('/ecole');
  });

  it('connexion et inscription restent ouvertes aux visiteurs', async () => {
    expect(await run(guestGuard)).toBeTrue();
  });
});

describe('safeReturnUrl', () => {
  it('accepte une page de la bonne zone', () => {
    expect(safeReturnUrl('/ecole/cours', 'ECOLE')).toBe('/ecole/cours');
    expect(safeReturnUrl('/eleve', 'ELEVE')).toBe('/eleve');
  });

  it('refuse la zone de l\'autre profil', () => {
    expect(safeReturnUrl('/ecole/cours', 'ELEVE')).toBeNull();
  });

  it('refuse tout ce qui pourrait renvoyer vers un autre site (redirection ouverte)', () => {
    expect(safeReturnUrl('https://pirate.example/ecole', 'ECOLE')).toBeNull();
    expect(safeReturnUrl('//pirate.example/ecole', 'ECOLE')).toBeNull();
    expect(safeReturnUrl('/\\pirate.example', 'ECOLE')).toBeNull();
    expect(safeReturnUrl('/ecole-evil', 'ECOLE')).toBeNull();
    expect(safeReturnUrl('javascript:alert(1)', 'ECOLE')).toBeNull();
    expect(safeReturnUrl('', 'ECOLE')).toBeNull();
    expect(safeReturnUrl(null, 'ECOLE')).toBeNull();
  });
});
