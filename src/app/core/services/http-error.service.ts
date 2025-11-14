import { Injectable } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class HttpErrorService {
  constructor(private snack: MatSnackBar) {}

  handleHttpError<T>() {
    return catchError((err: any) => {
      let msg = 'Unexpected error occurred.';
      switch (err.status) {
        case 0: msg = 'Cannot connect to server.'; break;
        case 401: msg = 'Unauthorized — please log in again.'; break;
        case 403: msg = 'Forbidden — access denied.'; break;
        case 404: msg = 'Not found.'; break;
        case 422: msg = err.error?.message ?? 'Validation failed.'; break;
        case 500: msg = 'Internal server error.'; break;
      }
      this.snack.open(msg, 'Close', { duration: 3500 });
      return throwError(() => err);
    });
  }
}
