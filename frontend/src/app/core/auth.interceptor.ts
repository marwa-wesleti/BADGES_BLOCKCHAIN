import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { SILENT_401 } from './http-context';
import { TokenStore } from './token.store';

/**
 * Ajoute "Authorization: Bearer <jeton>" aux appels de NOTRE API seulement (jamais a un autre site).
 * Si le serveur repond 401 alors qu'on etait connecte, la session est terminee proprement.
 * Les routes /api/auth/* sont exclues : un mauvais mot de passe est une reponse 401 normale, pas une session expiree.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenStore);
  const auth = inject(AuthService);
  const token = tokens.token();
  const ownApi = req.url.startsWith('/api/');
  const request = token && ownApi ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      const silent = req.context.get(SILENT_401);
      if (error instanceof HttpErrorResponse && error.status === 401 && ownApi && token && !silent && !req.url.startsWith('/api/auth/')) {
        auth.expire();
      }
      return throwError(() => error);
    }),
  );
};
