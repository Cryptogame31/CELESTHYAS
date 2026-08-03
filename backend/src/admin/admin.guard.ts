import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * AdminGuard — must be used AFTER JwtAuthGuard so req.user is populated.
 * Checks that the authenticated user has role === 'admin'.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== 'admin') {
      throw new ForbiddenException(
        'Acceso denegado. Se requiere rol de administrador / Access denied. Admin role required.',
      );
    }

    return true;
  }
}
