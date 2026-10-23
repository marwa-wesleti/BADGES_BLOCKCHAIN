import { HttpContext } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { SILENT_401 } from './http-context';
import { ToastService } from './toast.service';
import { TokenStore } from './token.store';
import { ApiBody, ApiResult, User } from '../models';

interface LoginResponse extends ApiBody {
  token: string;
  user: User;
}

export interface RegisterResponse extends LoginResponse {
  privateKey: string;
}

/** Qui est connecte : connexion, inscription, deconnexion, et restauration de la session apres un rechargement. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly tokens = inject(TokenStore);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  readonly user = signal<User | null>(null);
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly role = computed(() => this.user()?.role ?? null);
  /** La page d'accueil de chaque profil : l'espace ecole, l'espace eleve, ou l'accueil public. */
  readonly homeUrl = computed(() => (this.role() === 'ECOLE' ? '/ecole' : this.role() === 'ELEVE' ? '/eleve' : '/'));

  private restoring: Promise<void> | null = null;

  /** Se resout quand on sait si quelqu'un est connecte (une seule restauration par chargement de page). */
  ready(): Promise<void> {
    return (this.restoring ??= this.restore());
  }

  private async restore(): Promise<void> {
    if (!this.tokens.token()) {
      return;
    }
    // silencieux : un jeton perime est simplement oublie ; le message "session expiree" est reserve a un usage en cours
    const result = await this.api.call<{ user: User }>('GET', '/api/me', undefined, new HttpContext().set(SILENT_401, true));
    if (result.ok) {
      this.user.set(result.data.user);
    } else {
      this.tokens.set(null);
    }
  }

  async login(email: string, password: string): Promise<ApiResult<LoginResponse>> {
    const result = await this.api.call<LoginResponse>('POST', '/api/auth/login', { email, password });
    if (result.ok) {
      this.startSession(result.data);
    }
    return result;
  }

  async register(username: string, email: string, password: string): Promise<ApiResult<RegisterResponse>> {
    const result = await this.api.call<RegisterResponse>('POST', '/api/auth/register', { username, email, password });
    if (result.ok) {
      this.startSession(result.data);
    }
    return result;
  }

  private startSession(data: LoginResponse): void {
    this.tokens.set(data.token);
    this.user.set(data.user);
    this.restoring = Promise.resolve();
  }

  logout(): void {
    this.tokens.set(null);
    this.user.set(null);
    void this.router.navigateByUrl('/');
  }

  /** Le jeton n'est plus valide (expire, ou compte supprime) : retour a la connexion, avec une explication. */
  expire(): void {
    if (!this.tokens.token() && !this.user()) {
      return;
    }
    this.tokens.set(null);
    this.user.set(null);
    this.toasts.warn('Votre session a expiré : reconnectez-vous.');
    void this.router.navigateByUrl('/connexion');
  }
}
